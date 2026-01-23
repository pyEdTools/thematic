'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { runGuidedAnalysis, getProjectStatus } from '@/lib/api';
import { Loader2, RefreshCw, Sparkles, Map, Layout, GripVertical, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  DndContext, 
  closestCorners, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

interface CodePoint {
  id: string;
  text: string;
  original_segment: string;
  theme_name: string;
  sentiment_score: number;
  x: number;
  y: number;
  cluster: number;
}

interface ThemeInfo {
  id: string;
  name: string;
  is_seed: boolean;
}

const SortableCodeCard = ({ code, themeColor, viewMode, getSentimentColor }: { code: CodePoint, themeColor: string, viewMode: 'theme' | 'sentiment', getSentimentColor: (s: number) => string }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: code.id,
    data: {
      code
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group cursor-default hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all relative"
    >
      <div className="flex flex-col space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div 
              {...attributes} 
              {...listeners} 
              className="cursor-grab p-1 text-gray-300 hover:text-primary transition-colors flex-shrink-0"
            >
              <GripVertical size={14} />
            </div>
            <span className="text-[11px] font-black text-ucm-navy uppercase tracking-tight leading-tight truncate">{code.text}</span>
          </div>
          {viewMode === 'sentiment' && (
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0 mt-1" 
              style={{ backgroundColor: getSentimentColor(code.sentiment_score) }}
            />
          )}
        </div>
        <p className="text-[11px] text-gray-400 font-medium leading-relaxed italic line-clamp-3 group-hover:text-gray-600 transition-colors">
          "{code.original_segment}"
        </p>
      </div>
    </div>
  );
};

interface ThemeVisualizationProps {
  projectId: string;
}

export const ThemeVisualization: React.FC<ThemeVisualizationProps> = ({ projectId }) => {
  const [points, setPoints] = useState<CodePoint[]>([]);
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<CodePoint | null>(null);
  const [viewMode, setViewMode] = useState<'theme' | 'sentiment'>('theme');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getSentimentColor = (score: number) => {
    if (score > 0.2) return '#10b981'; // Positive Green
    if (score < -0.2) return '#ef4444'; // Negative Red
    return '#94a3b8'; // Neutral Gray
  };

  const fetchPointsFromSupabase = async () => {
    try {
      // 1. Fetch Themes
      const { data: themesData, error: themesError } = await supabase
        .from('themes')
        .select('*')
        .eq('project_id', projectId);

      if (themesError) throw themesError;
      
      const themeInfo: ThemeInfo[] = themesData.map(t => ({
        id: t.id,
        name: t.theme_name,
        is_seed: t.is_user_defined
      }));
      setThemes(themeInfo);

      // 2. Fetch Codes with their positions
      const { data: codesData, error: codesError } = await supabase
        .from('codes')
        .select(`
          id, 
          code_text, 
          sentiment_score, 
          x, 
          y, 
          cluster_id, 
          manual_theme_id,
          document_rows(content)
        `)
        .eq('project_id', projectId)
        .not('x', 'is', null); // Only fetch points that have been analyzed

      if (codesError) throw codesError;

      // Map cluster IDs to theme names for consistent display
      const themeIdToName = themesData.reduce((acc, t) => {
        acc[t.id] = t.theme_name;
        return acc;
      }, {} as Record<string, string>);

      // Map results to CodePoint interface
      const mappedPoints: CodePoint[] = codesData.map(c => {
        const docRows = c.document_rows as any;
        const content = Array.isArray(docRows) ? docRows[0]?.content : docRows?.content;
        
        // Priority: Manual Theme > Cluster-based Theme
        let themeName = 'Uncategorized';
        if (c.manual_theme_id && themeIdToName[c.manual_theme_id]) {
          themeName = themeIdToName[c.manual_theme_id];
        } else {
          // If no manual theme, we use the cluster_id to find the theme
          // Note: In our guided K-Means, cluster_id corresponds to the index of the theme
          const themeAtCluster = themesData[c.cluster_id];
          if (themeAtCluster) themeName = themeAtCluster.theme_name;
        }

        return {
          id: c.id,
          text: c.code_text,
          sentiment_score: c.sentiment_score || 0,
          x: c.x || 0,
          y: c.y || 0,
          cluster: c.cluster_id || 0,
          theme_name: themeName,
          original_segment: content || 'N/A'
        };
      });

      setPoints(mappedPoints);
    } catch (err) {
      console.error('Error fetching points from Supabase:', err);
      toast.error('Failed to load analysis data');
    }
  };

  const pollAnalysisStatus = async () => {
    const interval = setInterval(async () => {
      try {
        const statusData = await getProjectStatus(projectId);
        setAnalysisStatus(statusData.analysis_status);
        
        if (statusData.analysis_status === 'completed') {
          clearInterval(interval);
          setLoading(false);
          await fetchPointsFromSupabase();
          toast.success('Analysis complete!');
        } else if (statusData.analysis_status === 'error') {
          clearInterval(interval);
          setLoading(false);
          setErrorMessage(statusData.analysis_error);
          toast.error('Analysis failed');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await runGuidedAnalysis(projectId);
      if (response.status === 'processing') {
        setAnalysisStatus('processing');
        pollAnalysisStatus();
      } else {
        // Fallback for older backend versions or instant completion
        setAnalysisStatus('completed');
        await fetchPointsFromSupabase();
        setLoading(false);
      }
    } catch (error) {
      console.error('Error starting guided analysis:', error);
      setAnalysisStatus('error');
      setLoading(false);
      toast.error('Failed to start analysis');
    }
  };

  useEffect(() => {
    if (projectId) {
      // On mount, check if there's an ongoing analysis or if we already have data
      const checkInitialStatus = async () => {
        const statusData = await getProjectStatus(projectId);
        setAnalysisStatus(statusData.analysis_status);
        if (statusData.analysis_status === 'processing') {
          setLoading(true);
          pollAnalysisStatus();
        } else {
          fetchPointsFromSupabase();
        }
      };
      checkInitialStatus();
    }
  }, [projectId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const codeId = active.id as string;
    const overId = over.id as string;

    // Check if we dropped over a theme container or an item in a theme container
    let newThemeName = '';
    let newThemeId = '';

    // If dropped over a theme column header/container
    const themeMatch = themes.find(t => t.id === overId || t.name === overId);
    if (themeMatch) {
      newThemeName = themeMatch.name;
      newThemeId = themeMatch.id;
    } else {
      // If dropped over another code card
      const targetPoint = points.find(p => p.id === overId);
      if (targetPoint) {
        newThemeName = targetPoint.theme_name;
        const tInfo = themes.find(t => t.name === newThemeName);
        if (tInfo) newThemeId = tInfo.id;
      }
    }

    if (newThemeName && newThemeId) {
      const point = points.find(p => p.id === codeId);
      if (point && point.theme_name !== newThemeName) {
        // Optimistic UI update
        setPoints(prev => prev.map(p => 
          p.id === codeId ? { ...p, theme_name: newThemeName } : p
        ));

        try {
          // Persist to database
          const { error } = await supabase
            .from('codes')
            .update({ manual_theme_id: newThemeId })
            .eq('id', codeId);

          if (error) throw error;
          toast.success(`Moved to ${newThemeName}`);
        } catch (err) {
          console.error('Error updating theme:', err);
          toast.error('Failed to move code');
          // Revert on error
          setPoints(prev => prev.map(p => 
            p.id === codeId ? { ...p, theme_name: point.theme_name } : p
          ));
        }
      }
    }
  };

  const getNormalizedPoints = () => {
    if (points.length === 0) return { normalizedPoints: [], ranges: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const normalizedPoints = points.map(p => {
      // Add deterministic jitter based on ID so overlapping points become visible
      // but stay in the same place across re-renders
      const hash = p.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const jitterX = ((hash % 100) / 100 - 0.5) * 4;
      const jitterY = (((hash * 13) % 100) / 100 - 0.5) * 4;

      return {
        ...p,
        normX: ((p.x - minX) / rangeX) * 80 + 10 + jitterX,
        normY: 90 - ((p.y - minY) / rangeY) * 80 + jitterY
      };
    });

    return { normalizedPoints, ranges: { minX, maxX, minY, maxY } };
  };

  const { normalizedPoints: normPoints, ranges } = getNormalizedPoints();

  const getAxisTicks = (min: number, max: number, count: number = 5) => {
    const ticks = [];
    const step = (max - min) / (count - 1);
    for (let i = 0; i < count; i++) {
      ticks.push(min + step * i);
    }
    return ticks;
  };
  const colors = ['#00bbf9', '#fee440', '#9b5de5', '#284b63', '#353535', '#d9d9d9'];

  // Create a consistent color map for themes
  const uniqueThemes = Array.from(new Set(points.map(p => p.theme_name))).sort();
  const themeColorMap = uniqueThemes.reduce((acc, name, i) => {
    acc[name] = colors[i % colors.length];
    return acc;
  }, {} as Record<string, string>);

  const groupedPoints = points.reduce((acc, point) => {
    if (!acc[point.theme_name]) {
      acc[point.theme_name] = [];
    }
    acc[point.theme_name].push(point);
    return acc;
  }, {} as Record<string, CodePoint[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-ucm-navy tracking-tight flex items-center uppercase">
            <Map className="h-6 w-6 mr-2 text-primary" />
            Thematic Landscape
          </h2>
          <p className="text-sm font-medium text-gray-500">Visualization guided by your anchor themes and seeds.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('theme')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'theme' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}
            >
              Themes
            </button>
            <button 
              onClick={() => setViewMode('sentiment')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'sentiment' ? 'bg-white shadow-sm text-primary' : 'text-gray-400'}`}
            >
              Sentiment
            </button>
          </div>
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="flex items-center px-4 py-2 bg-ucm-navy text-white rounded-xl text-sm font-black hover:bg-primary transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh Map
          </button>
        </div>
      </div>

      <div className="relative w-full aspect-[4/3] bg-white border border-gray-100 rounded-[40px] overflow-hidden shadow-xl shadow-primary/10 group">
        {analysisStatus === 'processing' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <Sparkles className="h-6 w-6 text-ucm-gold absolute -top-2 -right-2 animate-pulse" />
              </div>
              <p className="text-gray-500 font-black uppercase tracking-widest text-xs">AI is processing your data...</p>
              <p className="text-[10px] text-gray-400 font-medium">This may take a minute for larger datasets.</p>
            </div>
          </div>
        ) : analysisStatus === 'error' ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center space-y-4 p-8 text-center">
              <div className="p-4 bg-red-50 rounded-full text-red-500">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Analysis Failed</h3>
              <p className="text-sm text-gray-500 max-w-xs">{errorMessage || 'An unknown error occurred during AI processing.'}</p>
              <button 
                onClick={fetchData}
                className="mt-4 px-6 py-2 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : points.length > 0 ? (
          <>
            <svg viewBox="0 0 100 100" className="w-full h-full p-8 overflow-visible">
              {/* Axis Labels */}
              <text x="50" y="98" textAnchor="middle" className="text-[3px] font-black fill-gray-400 uppercase tracking-widest">Principal Component 1</text>
              <text x="2" y="50" textAnchor="middle" transform="rotate(-90, 2, 50)" className="text-[3px] font-black fill-gray-400 uppercase tracking-widest">Principal Component 2</text>
              
              {/* Grid Lines (Subtle) */}
              <line x1="10" y1="10" x2="10" y2="90" stroke="currentColor" strokeWidth="0.1" className="text-gray-200" />
              <line x1="10" y1="90" x2="90" y2="90" stroke="currentColor" strokeWidth="0.1" className="text-gray-200" />

              {/* X-axis Ticks */}
              {getAxisTicks(ranges.minX, ranges.maxX).map((tick, i) => {
                const xPos = 10 + (i * 80) / 4;
                return (
                  <g key={`x-tick-${i}`}>
                    <line x1={xPos} y1="90" x2={xPos} y2="91.5" stroke="currentColor" strokeWidth="0.1" className="text-gray-300" />
                    <text x={xPos} y="94" textAnchor="middle" className="text-[2px] font-bold fill-gray-400">{tick.toFixed(2)}</text>
                  </g>
                );
              })}

              {/* Y-axis Ticks */}
              {getAxisTicks(ranges.minY, ranges.maxY).map((tick, i) => {
                const yPos = 90 - (i * 80) / 4;
                return (
                  <g key={`y-tick-${i}`}>
                    <line x1="8.5" y1={yPos} x2="10" y2={yPos} stroke="currentColor" strokeWidth="0.1" className="text-gray-300" />
                    <text x="7.5" y={yPos} textAnchor="end" dominantBaseline="middle" className="text-[2px] font-bold fill-gray-400">{tick.toFixed(2)}</text>
                  </g>
                );
              })}

              {normPoints.map((point) => (
                <motion.circle
                  key={point.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    cx: point.normX,
                    cy: point.normY
                  }}
                  transition={{ type: 'spring', stiffness: 100, damping: 20, delay: Math.random() * 0.5 }}
                  r="1.5"
                  fill={viewMode === 'theme' ? themeColorMap[point.theme_name] : getSentimentColor(point.sentiment_score)}
                  className="cursor-pointer hover:stroke-white hover:stroke-[0.5] transition-all"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </svg>

            {/* Legend */}
            <div className="absolute top-6 left-6 flex flex-col space-y-2 max-w-[200px]">
              {viewMode === 'theme' ? (
                uniqueThemes.map((name) => (
                  <div key={name} className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColorMap[name] }} />
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider truncate">{name}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Positive</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-[#94a3b8]" />
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Neutral</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider">Negative</span>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
            <div className="p-6 bg-gray-50 rounded-full mb-4 text-gray-300">
              <Map className="h-12 w-12" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase tracking-tight">Map is ready to be generated</h3>
            <p className="text-gray-500 max-w-xs mb-8 font-medium">After defining your seeds, click the button to generate your thematic landscape.</p>
            <button 
              onClick={fetchData}
              className="px-8 py-3 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:bg-ucm-navy transition-all active:scale-95 uppercase tracking-widest text-sm"
            >
              Generate Landscape
            </button>
          </div>
        )}

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute bottom-8 left-8 right-8 bg-ucm-navy/95 backdrop-blur-md p-6 rounded-[24px] shadow-2xl border border-white/10 pointer-events-none z-20"
            >
              <div className="flex flex-col space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col space-y-1">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Predicted Theme</span>
                    <span className="text-white font-black text-lg tracking-tight leading-none uppercase">{hoveredPoint.theme_name}</span>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-white uppercase tracking-wider">
                      Code: {hoveredPoint.text}
                    </div>
                    {viewMode === 'sentiment' && (
                      <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                        hoveredPoint.sentiment_score > 0.2 ? 'bg-emerald-500/20 text-emerald-400' :
                        hoveredPoint.sentiment_score < -0.2 ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        Sentiment: {hoveredPoint.sentiment_score > 0.2 ? 'Positive' : hoveredPoint.sentiment_score < -0.2 ? 'Negative' : 'Neutral'} ({hoveredPoint.sentiment_score.toFixed(2)})
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-[1px] bg-white/10 w-full" />
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Original Data Segment</span>
                  <p className="text-gray-300 text-sm italic font-medium leading-relaxed line-clamp-3">
                    "{hoveredPoint.original_segment}"
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Trello Board Style Table */}
      {points.length > 0 && (
        <div className="space-y-6 pt-10">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-ucm-navy tracking-tight flex items-center uppercase">
              <Layout className="h-6 w-6 mr-2 text-primary" />
              Thematic Board
            </h2>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Explore codes grouped by their themes. Drag cards to reassign them.</p>
              <div className="text-[10px] font-black text-primary bg-primary/5 px-3 py-1 rounded-full uppercase tracking-widest border border-primary/10">
                Manual Recoding Enabled
              </div>
            </div>
          </div>

          <DndContext 
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
          >
            <div className="flex space-x-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {Object.entries(groupedPoints).map(([themeName, themeCodes]) => {
                const themeInfo = themes.find(t => t.name === themeName);
                const themeId = themeInfo?.id || themeName;

                return (
                  <div 
                    key={themeName} 
                    className="flex-shrink-0 w-80 flex flex-col bg-gray-50/50 rounded-[32px] border border-gray-100 overflow-hidden group hover:border-primary transition-colors"
                  >
                    <div className="p-5 flex items-center justify-between bg-white border-b border-gray-100">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: themeColorMap[themeName] }} />
                        <h3 className="font-black text-ucm-navy truncate uppercase tracking-tight text-sm">{themeName}</h3>
                      </div>
                      <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-400 group-hover:text-primary transition-colors">
                        {themeCodes.length}
                      </span>
                    </div>
                    
                    <SortableContext 
                      id={themeId}
                      items={themeCodes.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[500px] scrollbar-hide min-h-[100px]">
                        {themeCodes.map((code) => (
                          <SortableCodeCard 
                            key={code.id} 
                            code={code} 
                            themeColor={themeColorMap[themeName]}
                            viewMode={viewMode}
                            getSentimentColor={getSentimentColor}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                );
              })}
            </div>
          </DndContext>
        </div>
      )}
    </div>
  );
};
