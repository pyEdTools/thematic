'use client';

import React, { useState, useEffect } from 'react';
import { ProjectList } from '@/components/ProjectList';
import { CreateProject } from '@/components/CreateProject';
import { LayoutDashboard, Plus, X, Search, Settings, User, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUsername(profile.username);
      } else {
        // Fallback to email prefix if username is not set
        setUsername(user.email?.split('@')[0] || 'Researcher');
      }
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-primary/10 selection:text-primary">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="w-10 h-10 bg-ucm-navy rounded-2xl flex items-center justify-center transition-all group-hover:bg-primary group-hover:rotate-3 shadow-lg shadow-gray-200">
              <LayoutDashboard className="text-white h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tight text-ucm-navy leading-none">TAForEd</h1>
              <span className="text-[8px] font-bold text-ucm-gold uppercase tracking-[0.2em]">Research Edition</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-ucm-navy transition-all active:scale-95">
              <Search className="h-5 w-5" />
            </button>
            <div className="h-6 w-[1px] bg-gray-200" />
            <button 
              onClick={handleLogout}
              className="p-2.5 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-600 transition-all active:scale-95 group"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
            <div className="w-10 h-10 bg-primary/10 border-2 border-white rounded-2xl flex items-center justify-center text-primary font-black shadow-sm">
              {username ? username[0].toUpperCase() : <User className="h-5 w-5" />}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <div className="bg-white border-b px-6 py-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-5xl font-black text-ucm-navy tracking-tight leading-none">
              {username || 'Researcher'} <br />
              <span className="text-primary italic font-black">Dashboard</span>
            </h2>
            <p className="text-gray-500 text-xl font-medium leading-relaxed">
              Welcome back. You have access to all your research projects and qualitative data analysis tools.
            </p>
          </div>
          <div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:bg-ucm-navy hover:-translate-y-1 transition-all active:scale-95 flex items-center text-lg uppercase tracking-widest"
            >
              <Plus className="h-6 w-6 mr-2" /> New Project
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 mt-12 mb-20 w-full flex-1">
        <div className="flex flex-col space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center">
              <div className="w-1.5 h-1.5 bg-ucm-gold rounded-full mr-2" />
              Active Projects
            </h3>
          </div>
          
          <ProjectList />
        </div>
      </main>

      {/* Modal Overlay */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-ucm-navy/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-md shadow-2xl relative overflow-hidden z-10"
            >
              <div className="p-8 border-b flex items-center justify-between bg-gray-50/50 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-ucm-gold" />
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary rounded-xl">
                    <Plus className="text-white h-5 w-5" />
                  </div>
                  <h3 className="font-black text-xl text-ucm-navy tracking-tight uppercase tracking-widest">New Project</h3>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors active:scale-90"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-8">
                <CreateProject onProjectCreated={() => {
                  setShowCreateModal(false);
                  window.location.reload();
                }} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
