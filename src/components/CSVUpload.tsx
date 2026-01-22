'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Upload, FileText, Check, Loader2, X, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CSVUploadProps {
  projectId: string;
  onUploadComplete: () => void;
}

interface PreviewState {
  headers: string[];
  data: any[];
  fileName: string;
}

const PreviewCell = ({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const isLong = content.length > 50;

  return (
    <div 
      onClick={() => isLong && setIsExpanded(!isExpanded)}
      className={`py-4 px-4 text-gray-300 font-medium leading-relaxed italic transition-all cursor-pointer
        ${isExpanded ? 'whitespace-normal' : 'line-clamp-1 truncate max-w-[200px]'}
        ${isLong && !isExpanded ? 'hover:text-white' : ''}`}
    >
      {content}
      {isLong && !isExpanded && (
        <span className="ml-2 text-[8px] text-ucm-gold uppercase font-black opacity-50 group-hover:opacity-100">
          ... click to expand
        </span>
      )}
    </div>
  );
};

export const CSVUpload: React.FC<CSVUploadProps> = ({ projectId, onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const processFile = async (file: File) => {
    setError(null);
    setSelectedFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        setPreview({
          headers,
          data: results.data.slice(0, 5), // Only show first 5 for preview
          fileName: file.name
        });
        
        // Auto-select text-heavy columns
        const textHeuristic = headers.filter(h => 
          ['content', 'text', 'feedback', 'response', 'message', 'comment'].includes(h.toLowerCase())
        );
        setSelectedColumns(textHeuristic.length > 0 ? textHeuristic : []);
      },
      error: (err) => {
        setError(err.message);
      }
    });
  };

  const handleConfirmUpload = async () => {
    if (!preview || selectedColumns.length === 0) return;
    
    setIsUploading(true);
    try {
      // 1. Create document entry
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert([{ project_id: projectId, name: preview.fileName }])
        .select()
        .single();

      if (docError) throw docError;

      if (!selectedFile) throw new Error("File not found");

      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rowsToInsert = results.data.map((row: any) => {
            // Combine selected columns into one text field
            const combinedContent = selectedColumns
              .map(col => String(row[col] || ''))
              .filter(text => text.trim() !== '')
              .join('\n\n');

            return {
              document_id: doc.id,
              content: combinedContent,
              metadata: row
            };
          }).filter(r => r.content.trim() !== '');

          if (rowsToInsert.length === 0) {
            throw new Error("No content found in selected columns.");
          }

          // 3. Insert document rows
          const { error: rowsError } = await supabase
            .from('document_rows')
            .insert(rowsToInsert);

          if (rowsError) throw rowsError;

          toast.success('Upload complete!');
          onUploadComplete();
        }
      });
    } catch (err: any) {
      setError(err.message);
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full space-y-6">
      {!preview ? (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative group p-10 border-2 border-dashed rounded-[32px] transition-all duration-300 flex flex-col items-center justify-center text-center
            ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary hover:bg-gray-50'}`}
        >
          <div className={`p-4 rounded-full mb-4 transition-colors ${dragActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400 group-hover:bg-primary/5 group-hover:text-primary'}`}>
            <Upload className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <p className="text-xl font-bold text-gray-900">Drop your CSV here</p>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">
              Upload your qualitative data. You'll be able to select specific columns in the next step.
            </p>
          </div>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            id="csv-upload-input"
          />

          <div className="mt-6">
            <span className="px-6 py-2.5 bg-ucm-navy text-white rounded-xl text-sm font-bold shadow-lg shadow-ucm-navy/20 group-hover:bg-primary transition-all active:scale-95 inline-block uppercase tracking-widest">
              Select File
            </span>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-xl"
        >
          <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-ucm-navy flex items-center uppercase tracking-widest">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                Select Columns to Analyze
              </h3>
              <p className="text-sm text-gray-500 font-medium">Choose which columns contain the feedback or text you want to process.</p>
            </div>
            <button 
              onClick={() => {
                setPreview(null);
                setSelectedColumns([]);
              }}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {preview.headers.map((header) => (
                <button
                  key={header}
                  onClick={() => {
                    setSelectedColumns(prev => 
                      prev.includes(header) 
                        ? prev.filter(h => h !== header) 
                        : [...prev, header]
                    );
                  }}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                    selectedColumns.includes(header)
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                  }`}
                >
                  <span className="font-bold text-sm truncate uppercase tracking-tight">{header}</span>
                  {selectedColumns.includes(header) ? (
                    <Check className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-gray-200 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="bg-ucm-navy rounded-3xl p-8 text-white mb-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Database className="h-20 w-20" />
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-ucm-gold mb-6 relative z-10">Preview (First 5 Rows)</h4>
              <div className="overflow-x-auto relative z-10">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {selectedColumns.map(col => (
                        <th key={col} className="pb-4 px-4 font-black text-primary uppercase tracking-widest text-xs">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.data.map((row, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0 group">
                        {selectedColumns.map(col => (
                          <td key={col}>
                            <PreviewCell content={String(row[col] || '')} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleConfirmUpload}
                disabled={isUploading || selectedColumns.length === 0}
                className="px-10 py-5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:bg-ucm-navy transition-all active:scale-95 flex items-center disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-3" />
                    Processing {preview.fileName}...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-3" />
                    Confirm & Start Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center text-red-700">
              <X className="h-4 w-4 mr-2 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
