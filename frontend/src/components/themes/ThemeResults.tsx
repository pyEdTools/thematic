'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  Download, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Table as TableIcon,
  FileJson,
  FileSpreadsheet,
  Loader2,
  TrendingUp,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';

interface ThemeResultsProps {
  projectId: string;
}

export const ThemeResults: React.FC<ThemeResultsProps> = ({ projectId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Themes for mapping
      const { data: themesData, error: themesError } = await supabase
        .from('themes')
        .select('id, theme_name')
        .eq('project_id', projectId);
      
      if (themesError) throw themesError;

      const themeIdToName = themesData.reduce((acc, t) => {
        acc[t.id] = t.theme_name;
        return acc;
      }, {} as Record<string, string>);

      // 2. Fetch Codes
      const { data: codesData, error: codesError } = await supabase
        .from('codes')
        .select(`
          id, 
          code_text, 
          sentiment_score, 
          cluster_id, 
          manual_theme_id,
          document_rows(content)
        `)
        .eq('project_id', projectId);

      if (codesError) throw codesError;

      if (!codesData || codesData.length === 0) {
        setData({ clusters: [] });
        return;
      }

      // 3. Map to clusters format
      const clusters = codesData.map(c => {
        const docRows = c.document_rows as any;
        const content = Array.isArray(docRows) ? docRows[0]?.content : docRows?.content;
        
        let themeName = 'Uncategorized';
        if (c.manual_theme_id && themeIdToName[c.manual_theme_id]) {
          themeName = themeIdToName[c.manual_theme_id];
        } else if (c.cluster_id !== null && themesData[c.cluster_id]) {
          themeName = themesData[c.cluster_id].theme_name;
        }

        return {
          id: c.id,
          theme_name: themeName,
          text: c.code_text,
          sentiment_score: c.sentiment_score,
          original_segment: content || 'N/A'
        };
      });

      setData({ clusters });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Analyzing your data distribution...</p>
      </div>
    );
  }

  if (!data || !data.clusters || data.clusters.length === 0) {
    return (
      <div className="bg-white p-12 rounded-[40px] border border-dashed border-gray-200 text-center">
        <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 uppercase">No results found</h3>
        <p className="text-gray-500">Run the AI analysis first to see your thematic insights.</p>
      </div>
    );
  }

  // Calculate Distribution
  const themeCounts = data.clusters.reduce((acc: any, curr: any) => {
    acc[curr.theme_name] = (acc[curr.theme_name] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(themeCounts).map(([name, count]) => ({
    name,
    count
  })).sort((a: any, b: any) => b.count - a.count);

  const colors = ['#00bbf9', '#fee440', '#9b5de5', '#284b63', '#353535', '#d9d9d9'];

  // Create a consistent color map for themes
  const uniqueThemes = Array.from(new Set(data.clusters.map((p: any) => p.theme_name))).sort() as string[];
  const themeColorMap = uniqueThemes.reduce((acc, name, i) => {
    acc[name] = colors[i % colors.length];
    return acc;
  }, {} as Record<string, string>);

  // Group data by theme for the Result Matrix
  const groupedData = data.clusters.reduce((acc: any, curr: any) => {
    if (!acc[curr.theme_name]) acc[curr.theme_name] = [];
    acc[curr.theme_name].push(curr);
    return acc;
  }, {});

  // Calculate Co-occurrence
  const getCoOccurrenceData = () => {
    const rowMap: Record<string, Set<string>> = {};
    data.clusters.forEach((c: any) => {
      if (!rowMap[c.original_segment]) rowMap[c.original_segment] = new Set();
      rowMap[c.original_segment].add(c.theme_name);
    });

    const links: Record<string, number> = {};
    Object.values(rowMap).forEach((themes) => {
      const themeList = Array.from(themes);
      for (let i = 0; i < themeList.length; i++) {
        for (let j = i + 1; j < themeList.length; j++) {
          const pair = [themeList[i], themeList[j]].sort().join('::');
          links[pair] = (links[pair] || 0) + 1;
        }
      }
    });

    return Object.entries(links).map(([pair, value]) => ({
      source: pair.split('::')[0],
      target: pair.split('::')[1],
      value: value as number
    }));
  };

  const coOccurrenceLinks = getCoOccurrenceData();

  const downloadCSV = () => {
    const headers = ['Theme', 'Code', 'Original Feedback'];
    const rows = data.clusters.map((c: any) => [
      c.theme_name,
      c.text,
      `"${c.original_segment.replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `analysis_results_${projectId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analysis_results_${projectId}.json`;
    link.click();
    toast.success('JSON exported');
  };

  return (
    <div className="space-y-10">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-ucm-navy tracking-tight uppercase">Thematic Analytics</h2>
          <p className="text-gray-500 font-medium text-lg">Quantitative breakdown of your qualitative analysis.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={downloadCSV}
            className="flex items-center px-6 py-3 bg-ucm-navy text-white rounded-2xl text-sm font-black hover:bg-primary transition-all active:scale-95 shadow-xl shadow-ucm-navy/20 uppercase tracking-widest"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2 text-ucm-gold" /> Export CSV
          </button>
          <button 
            onClick={downloadJSON}
            className="flex items-center px-6 py-3 bg-white border-2 border-gray-100 text-ucm-navy rounded-2xl text-sm font-black hover:bg-gray-50 transition-all active:scale-95 shadow-sm uppercase tracking-widest"
          >
            <FileJson className="h-4 w-4 mr-2 text-primary" /> Export JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Theme Volume Chart */}
        <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-xl shadow-primary/10">
          <div className="flex items-center space-x-3 mb-10">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-ucm-navy uppercase tracking-tight">Theme Volume</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Feedback Count per Theme</p>
            </div>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={100}
                  tick={{ fontSize: 12, fontWeight: 800, fill: '#64748b' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={32}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={themeColorMap[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Proportional Donut Chart */}
        <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-xl shadow-primary/10">
          <div className="flex items-center space-x-3 mb-10">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <PieChartIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-ucm-navy uppercase tracking-tight">Thematic Proportions</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Share of Total Insights</p>
            </div>
          </div>

          <div className="h-80 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={themeColorMap[entry.name]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Custom Legend */}
            <div className="hidden md:flex flex-col space-y-3 ml-4 max-w-[150px]">
              {chartData.slice(0, 5).map((theme) => (
                <div key={theme.name} className="flex items-center space-x-2 overflow-hidden">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: themeColorMap[theme.name] }} />
                  <span className="text-xs font-black text-gray-600 truncate uppercase">{theme.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Network Visualization (Simplified) */}
      <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-xl shadow-primary/10">
        <div className="flex items-center space-x-3 mb-10">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Share2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-ucm-navy uppercase tracking-tight">Thematic Co-occurrence</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">How themes connect within feedback</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-10 items-center">
          <div className="flex-1 w-full aspect-square md:aspect-video relative bg-gray-50 rounded-[32px] overflow-hidden border border-gray-100">
            {coOccurrenceLinks.length > 0 ? (
              <svg viewBox="0 0 400 200" className="w-full h-full p-10">
                {/* Simplified Circular Layout */}
                {Object.keys(themeCounts).map((theme, i, arr) => {
                  const angle = (i / arr.length) * 2 * Math.PI;
                  const x = 200 + 80 * Math.cos(angle);
                  const y = 100 + 60 * Math.sin(angle);
                  
                  return (
                    <g key={theme}>
                      {/* Connections */}
                      {coOccurrenceLinks
                        .filter(l => l.source === theme || l.target === theme)
                        .map((l, li) => {
                          const otherTheme = l.source === theme ? l.target : l.source;
                          const otherIndex = arr.indexOf(otherTheme);
                          const otherAngle = (otherIndex / arr.length) * 2 * Math.PI;
                          const ox = 200 + 80 * Math.cos(otherAngle);
                          const oy = 100 + 60 * Math.sin(otherAngle);
                          
                          return (
                            <line 
                              key={`${theme}-${li}`}
                              x1={x} y1={y} x2={ox} y2={oy} 
                              stroke={themeColorMap[theme]} 
                              strokeWidth={Number(l.value) * 0.5} 
                              strokeOpacity="0.2" 
                            />
                          );
                        })}
                      <circle cx={x} cy={y} r="6" fill={themeColorMap[theme]} />
                      <text x={x} y={y + 12} textAnchor="middle" className="text-[5px] font-black fill-gray-600 uppercase tracking-tighter">{theme}</text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-center p-10">
                <p className="text-gray-400 font-medium italic">No overlapping themes found. This happens when each piece of feedback only contains one unique theme.</p>
              </div>
            )}
          </div>
          
          <div className="w-full md:w-80 space-y-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Top Connections</h4>
            <div className="space-y-2">
              {coOccurrenceLinks.sort((a: any, b: any) => b.value - a.value).slice(0, 5).map((link: any, i: number) => (
                <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-primary transition-all">
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <span className="text-[10px] font-black text-ucm-navy uppercase truncate">{link.source}</span>
                    <Share2 className="h-3 w-3 text-gray-300 group-hover:text-primary transition-colors" />
                    <span className="text-[10px] font-black text-ucm-navy uppercase truncate">{link.target}</span>
                  </div>
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-lg">{link.value}x</span>
                </div>
              ))}
              {coOccurrenceLinks.length === 0 && (
                <p className="text-sm text-gray-400 italic">Collect more multi-theme feedback to see connections.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-primary/10 overflow-hidden">
        <div className="p-10 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <TableIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-ucm-navy uppercase tracking-tight">Result Matrix</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Consolidated Analysis Data</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/30">
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Theme</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Representative Code</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Source Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(groupedData).map(([themeName, points]: [string, any]) => (
                <React.Fragment key={themeName}>
                  {/* Theme Header Row */}
                  <tr className="bg-gray-50/50">
                    <td colSpan={3} className="px-10 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeColorMap[themeName] }} />
                        <h4 className="text-xs font-black text-ucm-navy uppercase tracking-[0.2em]">{themeName}</h4>
                        <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded-md border border-gray-100">
                          {points.length} Codes
                        </span>
                      </div>
                    </td>
                  </tr>
                  {/* Code Rows */}
                  {points.map((point: any) => (
                    <tr key={point.id} className="hover:bg-primary/[0.01] transition-colors group">
                      <td className="px-10 py-6">
                        <div className="flex flex-col space-y-2">
                          <span 
                            className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors w-fit"
                            style={{ 
                              backgroundColor: `${themeColorMap[themeName]}10`, 
                              color: themeColorMap[themeName],
                              borderColor: `${themeColorMap[themeName]}30`
                            }}
                          >
                            {point.theme_name}
                          </span>
                          {point.sentiment_score !== undefined && (
                            <span className={`text-[8px] font-black uppercase tracking-widest ${
                              point.sentiment_score > 0.2 ? 'text-emerald-500' :
                              point.sentiment_score < -0.2 ? 'text-red-500' :
                              'text-gray-400'
                            }`}>
                              {point.sentiment_score > 0.2 ? 'Positive' : point.sentiment_score < -0.2 ? 'Negative' : 'Neutral'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-10 py-6 font-black text-ucm-navy text-sm uppercase tracking-tight group-hover:text-primary transition-colors">{point.text}</td>
                      <td className="px-10 py-6 text-gray-500 text-sm italic line-clamp-2 max-w-lg leading-relaxed">
                        "{point.original_segment}"
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
