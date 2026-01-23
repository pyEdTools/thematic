'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Table, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Tag, 
  MessageSquare,
  Filter,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DataInspectorProps {
  projectId: string;
}

export const DataInspector: React.FC<DataInspectorProps> = ({ projectId }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_rows')
        .select(`
          id,
          content,
          metadata,
          codes (
            id,
            code_text
          ),
          documents!inner (
            project_id
          )
        `)
        .eq('documents.project_id', projectId);

      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = rows.filter(row => 
    row.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.codes.some((c: any) => c.code_text.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Loading your data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search feedback or codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-medium uppercase text-xs tracking-tight"
          />
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-6 py-4 bg-white border border-gray-100 rounded-2xl text-ucm-navy font-black text-xs flex items-center hover:bg-gray-50 transition-all uppercase tracking-widest">
            <Filter className="h-4 w-4 mr-2 text-primary" /> Filter
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-[40px] overflow-hidden shadow-xl shadow-primary/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-12">#</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Feedback Content</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Extracted Codes</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRows.map((row, index) => (
                <React.Fragment key={row.id}>
                  <tr 
                    className={`hover:bg-primary/[0.02] transition-colors cursor-pointer ${expandedRow === row.id ? 'bg-primary/5' : ''}`}
                    onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                  >
                    <td className="px-8 py-6 text-xs font-black text-gray-300 tracking-widest">{index + 1}</td>
                    <td className="px-8 py-6">
                      <p className="text-ucm-navy font-medium line-clamp-2 max-w-xl text-sm italic">{row.content}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-2">
                        {row.codes.length > 0 ? (
                          row.codes.map((code: any) => (
                            <span key={code.id} className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/10">
                              <Tag className="h-3 w-3 mr-1.5" /> {code.code_text}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-300 text-[10px] font-black uppercase tracking-widest italic">Not coded yet</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {expandedRow === row.id ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-gray-300" />}
                    </td>
                  </tr>
                  <AnimatePresence>
                    {expandedRow === row.id && (
                      <tr>
                        <td colSpan={4} className="px-8 py-0 border-none">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="py-10 px-12 bg-gray-50/50 rounded-[32px] mb-8 mt-2 border border-primary/10 relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-1 bg-ucm-gold" />
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                  <div className="flex items-center text-primary space-x-2">
                                    <MessageSquare className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Full Response</span>
                                  </div>
                                  <p className="text-ucm-navy text-lg font-medium leading-relaxed bg-white p-8 rounded-3xl border border-white shadow-xl shadow-primary/5 italic">
                                    "{row.content}"
                                  </p>
                                </div>
                                <div className="space-y-6">
                                  <div className="flex items-center text-primary space-x-2">
                                    <Tag className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">AI Insights</span>
                                  </div>
                                  <div className="bg-white p-8 rounded-3xl border border-white shadow-xl shadow-primary/5 space-y-6">
                                    <div className="flex flex-wrap gap-3">
                                      {row.codes.map((code: any) => (
                                        <div key={code.id} className="flex flex-col p-4 bg-gray-50 rounded-2xl border border-gray-100 min-w-[140px] group hover:border-primary transition-all">
                                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Extracted Code</span>
                                          <span className="text-sm font-black text-ucm-navy uppercase tracking-tight">{code.code_text}</span>
                                        </div>
                                      ))}
                                    </div>
                                    {row.codes.length === 0 && (
                                      <p className="text-gray-400 text-sm italic">Run the AI pipeline to extract themes from this feedback.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
