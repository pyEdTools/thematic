'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Folder, Calendar, ArrowRight, Loader2, Database, MoreVertical, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export const ProjectList = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data);
    }
    setLoading(false);
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      setProjects(projects.filter(p => p.id !== projectId));
      toast.success('Project deleted');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-gray-100 shadow-sm"
      >
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Folder className="h-10 w-10 text-gray-300" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Your workspace is empty</h3>
        <p className="text-gray-500 font-medium max-w-sm mx-auto">Create your first project to start your thematic analysis journey.</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {projects.map((project, index) => (
        <motion.div
          key={project.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Link 
            href={`/projects/${project.id}`}
            className="group block p-8 bg-white border border-gray-100 rounded-[32px] hover:border-primary hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 relative overflow-hidden h-full"
          >
            <div className="absolute top-0 right-0 p-6 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button
                onClick={(e) => handleDeleteProject(e, project.id)}
                className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <div className="p-2 bg-primary/10 text-primary rounded-xl">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
            
            <div className="flex flex-col h-full">
              <div className="mb-6 inline-flex">
                <div className="p-4 bg-gray-50 text-gray-400 group-hover:bg-primary group-hover:text-white transition-all duration-500 rounded-2xl">
                  <Database className="h-6 w-6" />
                </div>
              </div>
              
              <h3 className="text-2xl font-black text-ucm-navy group-hover:text-primary transition-colors tracking-tight mb-2">
                {project.name}
              </h3>
              <p className="text-gray-500 font-medium line-clamp-2 mb-8 flex-grow leading-relaxed">
                {project.description || "No description provided."}
              </p>
              
              <div className="pt-6 border-t border-gray-50 flex items-center justify-between mt-auto">
                <div className="flex items-center text-sm font-bold text-gray-400 uppercase tracking-wider">
                  <Calendar className="h-4 w-4 mr-2 text-gray-300" />
                  {new Date(project.created_at).toLocaleDateString()}
                </div>
                <div className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full group-hover:bg-primary group-hover:text-white transition-all uppercase tracking-widest">
                  Active
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
};
