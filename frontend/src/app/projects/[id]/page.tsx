'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { CSVUpload } from '@/components/upload/CSVUpload';
import { SeedThemeBuilder } from '@/components/themes/SeedThemeBuilder';
import { ThemeVisualization } from '@/components/themes/ThemeVisualization';
import { DataInspector } from '@/components/data/DataInspector';
import { ThemeResults } from '@/components/themes/ThemeResults';
import { processCoding, runFullPipeline, getProjectStatus } from '@/lib/api';
import { toast } from 'sonner';
import { 
  FileText, 
  ChevronRight,
  ArrowLeft,
  Loader2,
  Database,
  Calendar,
  MoreVertical,
  Trash2,
  Search,
  Layout,
  Sparkles,
  Zap,
  Table,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

export default function ProjectPage() {
  const { id } = useParams();
  const projectId = id as string;
  
  const [project, setProject] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'documents' | 'seeds' | 'upload' | 'analysis' | 'inspector' | 'results'>('documents');
  const [isProcessing, setIsProcessing] = useState(false);

  const pollStatus = async () => {
    const interval = setInterval(async () => {
      try {
        const statusData = await getProjectStatus(projectId);
        if (statusData.analysis_status === 'completed') {
          clearInterval(interval);
          setIsProcessing(false);
          toast.success('AI Pipeline finished!');
          // Refresh data if needed
          fetchData();
        } else if (statusData.analysis_status === 'error') {
          clearInterval(interval);
          setIsProcessing(false);
          toast.error(`Analysis failed: ${statusData.analysis_error}`);
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 2000);
    return () => clearInterval(interval);
  };

  useEffect(() => {
    if (projectId) {
      fetchData();
      // Check if already processing on load
      const checkInitialStatus = async () => {
        const statusData = await getProjectStatus(projectId);
        if (statusData.analysis_status === 'processing') {
          setIsProcessing(true);
          pollStatus();
        }
      };
      checkInitialStatus();
    }
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch project details
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (projError) throw projError;
      setProject(projData);

      // Fetch documents for this project
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select(`
          *,
          document_rows (count)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docsData || []);

    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document? All associated codes and data will be lost.')) return;
    
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);
      
      if (error) throw error;
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete document');
    }
  };

  if (loading && !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-gray-500 font-medium">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h1>
          <p className="text-gray-500 mb-6">This project might have been deleted or you don't have access.</p>
          <Link href="/dashboard" className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-ucm-navy transition-all uppercase tracking-widest text-sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-6">
          <Link href="/dashboard" className="p-2.5 hover:bg-gray-100 rounded-xl transition-all active:scale-95 group">
            <ArrowLeft className="h-5 w-5 text-gray-400 group-hover:text-ucm-navy" />
          </Link>
          <div className="h-8 w-[1px] bg-gray-200" />
          <div className="flex flex-col">
            <div className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">
              <span>Project</span>
              <ChevronRight className="h-3 w-3 mx-1 text-ucm-gold" />
              <span className="truncate max-w-[150px]">{project.name}</span>
            </div>
            <h1 className="font-black text-ucm-navy text-xl tracking-tight leading-none uppercase">{project.name}</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full uppercase tracking-widest hidden md:block">
            Standard Edition
          </div>
          <button className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-ucm-navy transition-all active:scale-95">
            <Layout className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Analysis Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ucm-navy/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-center"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-12 rounded-[40px] shadow-2xl max-w-lg w-full space-y-8 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-ucm-gold" />
              <div className="relative inline-flex">
                <Loader2 className="h-20 w-20 animate-spin text-primary" />
                <Sparkles className="h-8 w-8 text-ucm-gold absolute -top-2 -right-2 animate-pulse" />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black text-ucm-navy tracking-tight uppercase">AI Pipeline Running</h3>
                <p className="text-gray-500 font-medium text-lg leading-relaxed">
                  Extracting codes and mapping your thematic landscape. This usually takes 30-60 seconds depending on data size.
                </p>
              </div>
              <div className="pt-4">
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="w-1/2 h-full bg-primary rounded-full"
                  />
                </div>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Do not refresh or close this tab</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <div className="bg-white border-b px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-4xl font-black text-ucm-navy tracking-tight uppercase">Project Overview</h2>
            <p className="text-gray-500 text-lg leading-relaxed font-medium">
              {project.description || "Manage your qualitative data and prepare for thematic analysis."}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setActiveTab('upload')}
              className="px-8 py-4 bg-ucm-navy text-white rounded-2xl font-black shadow-xl shadow-ucm-navy/20 hover:bg-primary transition-all active:scale-95 flex items-center uppercase tracking-widest text-sm"
            >
              <Database className="h-4 w-4 mr-2 text-ucm-gold" /> Add Data
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl w-full mx-auto px-6 mt-10 flex-1 flex flex-col">
        {/* Tabs */}
        <div className="flex space-x-8 border-b border-gray-200 mb-8 overflow-x-auto scrollbar-hide">
          {[
            { id: 'documents', label: '1. Documents', icon: FileText },
            { id: 'seeds', label: '2. Define Seeds', icon: Sparkles },
            { id: 'analysis', label: '3. Run Analysis', icon: Zap },
            { id: 'results', label: '4. View Results', icon: BarChart3 },
            { id: 'inspector', label: 'Data Inspector', icon: Table },
            { id: 'upload', label: 'Upload Data', icon: Database },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 text-[11px] font-black uppercase tracking-widest flex items-center transition-all relative whitespace-nowrap ${activeTab === tab.id ? 'text-primary' : 'text-gray-400 hover:text-ucm-navy'}`}
            >
              <tab.icon className={`h-4 w-4 mr-2 ${activeTab === tab.id ? 'text-primary' : 'text-gray-300'}`} /> {tab.label}
              {activeTab === tab.id && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pb-20 flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'documents' && (
              <motion.div 
                key="docs"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                {documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map((doc) => (
                      <div key={doc.id} className="group bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-ucm-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex justify-between items-start mb-6">
                          <div className="p-4 bg-gray-50 text-gray-400 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all">
                            <FileText className="h-6 w-6" />
                          </div>
                          <button 
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                        <h3 className="text-xl font-black text-ucm-navy mb-2 truncate group-hover:text-primary transition-colors">{doc.name}</h3>
                        <div className="flex items-center text-xs text-gray-400 font-black uppercase tracking-widest mb-6">
                          <Database className="h-3 w-3 mr-1.5 text-ucm-gold" />
                          {doc.document_rows?.[0]?.count || 0} Segments
                        </div>
                        <div className="flex items-center text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] pt-6 border-t border-gray-50">
                          <Calendar className="h-3 w-3 mr-1.5" />
                          {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-20 rounded-[40px] border-2 border-dashed border-gray-100 text-center flex flex-col items-center justify-center">
                    <div className="p-6 bg-gray-50 text-gray-200 rounded-full mb-6">
                      <FileText className="h-16 w-12" />
                    </div>
                    <h3 className="text-2xl font-black text-ucm-navy mb-3 uppercase tracking-tight">No documents yet</h3>
                    <p className="text-gray-500 max-w-sm mb-10 font-medium leading-relaxed text-lg">Upload your first data collection to start organizing your thematic analysis.</p>
                    <button 
                      onClick={() => setActiveTab('upload')}
                      className="px-10 py-4 bg-ucm-navy text-white rounded-2xl font-black hover:bg-primary transition-all shadow-xl shadow-ucm-navy/20 active:scale-95 uppercase tracking-widest text-sm"
                    >
                      Upload CSV
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'seeds' && (
              <motion.div 
                key="seeds"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <SeedThemeBuilder 
                  projectId={projectId} 
                  onThemesUpdated={() => {
                    toast.success('Seeds saved!');
                    setActiveTab('analysis');
                  }} 
                />
              </motion.div>
            )}

            {activeTab === 'analysis' && (
              <motion.div 
                key="analysis"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="grid grid-cols-1 gap-12">
                  <div className="bg-gradient-to-br from-ucm-navy to-primary p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                    <Sparkles className="absolute top-[-20px] right-[-20px] h-40 w-40 text-white/5 rotate-12 transition-transform group-hover:scale-110" />
                    <div className="relative z-10 space-y-6">
                      <div className="inline-flex p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10">
                        <Zap className="h-6 w-6 text-ucm-gold" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black tracking-tight uppercase">AI Thematic Processor</h3>
                        <p className="text-gray-300 text-lg font-medium max-w-xl leading-relaxed">
                          Clicking below will run our analysis: extracting discrete codes using GPT-4o, then grouping them into your guided themes using semantic embeddings.
                        </p>
                      </div>
                      <button 
                        onClick={async () => {
                          try {
                            const { data: docs } = await supabase.from('documents').select('id').eq('project_id', projectId);
                            const docIds = docs?.map(d => d.id) || [];
                            const { data: rows } = await supabase.from('document_rows').select('id').in('document_id', docIds);
                            const rowIds = rows?.map(r => r.id) || [];
                            
                            if (rowIds.length > 0) {
                              setIsProcessing(true);
                              await runFullPipeline(projectId, rowIds);
                              toast.success('Pipeline started in background...');
                              pollStatus();
                            } else {
                              toast.warning('No data to process.');
                            }
                          } catch (e) { 
                            console.error(e); 
                            setIsProcessing(false);
                            toast.error('Failed to start pipeline');
                          }
                        }}
                        disabled={isProcessing}
                        className="px-8 py-4 bg-white text-ucm-navy rounded-2xl font-black hover:bg-ucm-gold hover:text-ucm-navy transition-all active:scale-95 shadow-xl disabled:opacity-50 flex items-center uppercase tracking-widest text-sm"
                      >
                        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                        Run Full AI Pipeline
                      </button>
                    </div>
                  </div>

                  <ThemeVisualization projectId={projectId} />
                </div>
              </motion.div>
            )}

            {activeTab === 'results' && (
              <motion.div 
                key="results"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <ThemeResults projectId={projectId} />
              </motion.div>
            )}

            {activeTab === 'inspector' && (
              <motion.div 
                key="inspector"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <DataInspector projectId={projectId} />
              </motion.div>
            )}

            {activeTab === 'upload' && (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="max-w-2xl"
              >
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                  <h2 className="text-2xl font-black text-gray-900 mb-2">Import Data</h2>
                  <p className="text-gray-500 mb-8 font-medium">Upload your qualitative feedback CSV. We'll store it in your project documents.</p>
                  <CSVUpload projectId={projectId} onUploadComplete={() => {
                    fetchData();
                    toast.success('Data imported successfully!');
                    setActiveTab('seeds'); // Automatically move to Step 2: Define Seeds
                  }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

