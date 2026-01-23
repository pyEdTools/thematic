'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, X, Tag, Sparkles, BookOpen, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Theme {
  id: string;
  theme_name: string;
  description: string;
  seed_words: string[];
}

interface SeedThemeBuilderProps {
  projectId: string;
  onThemesUpdated: () => void;
}

export const SeedThemeBuilder: React.FC<SeedThemeBuilderProps> = ({ projectId, onThemesUpdated }) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');

  const fetchThemes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('project_id', projectId);

    if (!error && data) {
      setThemes(data.map(t => ({
        ...t,
        seed_words: t.seed_words || []
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (projectId) fetchThemes();
  }, [projectId]);

  const addTheme = async () => {
    if (!newThemeName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('themes')
      .insert([{
        project_id: projectId,
        theme_name: newThemeName.trim(),
        seed_words: [],
        is_user_defined: true
      }])
      .select()
      .single();

    if (!error && data) {
      setThemes([...themes, { ...data, seed_words: [] }]);
      setNewThemeName('');
    } else if (error) {
      console.error('Error adding theme:', error);
      toast.error('Failed to add theme: ' + error.message);
    }
    setSaving(false);
  };

  const deleteTheme = async (id: string) => {
    const { error } = await supabase.from('themes').delete().eq('id', id);
    if (!error) {
      setThemes(themes.filter(t => t.id !== id));
    }
  };

  const addSeed = (themeId: string, seed: string) => {
    const trimmedSeed = seed.trim();
    if (!trimmedSeed) return;
    setThemes(themes.map(t => {
      if (t.id === themeId && !t.seed_words.includes(trimmedSeed)) {
        return { ...t, seed_words: [...t.seed_words, trimmedSeed] };
      }
      return t;
    }));
  };

  const removeSeed = (themeId: string, seed: string) => {
    setThemes(themes.map(t => {
      if (t.id === themeId) {
        return { ...t, seed_words: t.seed_words.filter(s => s !== seed) };
      }
      return t;
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    for (const theme of themes) {
      await supabase
        .from('themes')
        .update({ seed_words: theme.seed_words })
        .eq('id', theme.id);
    }
    setSaving(false);
    onThemesUpdated();
  };

  if (loading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-black text-ucm-navy tracking-tight flex items-center uppercase">
          <BookOpen className="h-6 w-6 mr-2 text-primary" />
          Anchor Themes & Seeds
        </h2>
        <p className="text-gray-500 font-medium">
          Define the themes you expect to find. These "seeds" will guide the AI to cluster your data accurately.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {themes.map((theme) => (
          <motion.div 
            key={theme.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all relative group"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-ucm-gold opacity-0 group-hover:opacity-100 transition-opacity" />
            <button 
              onClick={() => deleteTheme(theme.id)}
              className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-xl font-black text-ucm-navy mb-6 pr-8 uppercase tracking-tight group-hover:text-primary transition-colors">{theme.theme_name}</h3>
            
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {theme.seed_words.map(seed => (
                    <motion.span 
                      key={seed}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/10"
                    >
                      {seed}
                      <button onClick={() => removeSeed(theme.id, seed)} className="ml-2 hover:text-ucm-navy">
                        <X className="h-3 w-3" />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>

              <div className="relative flex items-center">
                <input 
                  type="text"
                  placeholder="Add seed word..."
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-gray-900 placeholder:text-gray-300"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      addSeed(theme.id, input.value);
                      input.value = '';
                    }
                  }}
                />
                <button 
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    addSeed(theme.id, input.value);
                    input.value = '';
                  }}
                  className="absolute right-3 p-2 text-gray-300 hover:text-primary transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Add New Theme Card */}
        <div className="bg-gray-50/50 border-2 border-dashed border-gray-200 p-8 rounded-[32px] flex flex-col justify-center items-center min-h-[250px] text-center group hover:border-primary transition-colors">
          <div className="p-4 bg-white rounded-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform">
            <Sparkles className="h-8 w-8 text-ucm-gold" />
          </div>
          <h3 className="font-black text-ucm-navy mb-6 uppercase tracking-[0.2em] text-sm">New Anchor Theme</h3>
          <div className="flex w-full max-w-xs space-x-3">
            <input 
              type="text"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              placeholder="Theme name..."
              className="flex-1 px-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-primary outline-none text-black placeholder:text-gray-300"
              onKeyDown={(e) => e.key === 'Enter' && addTheme()}
            />
            <button 
              onClick={addTheme}
              disabled={saving}
              className="p-3 bg-ucm-navy text-white rounded-2xl hover:bg-primary transition-all disabled:opacity-50 shadow-xl shadow-ucm-navy/20"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-8">
        <button 
          onClick={saveAll}
          disabled={saving || themes.length === 0}
          className="px-10 py-5 bg-primary text-white rounded-2xl font-black shadow-2xl shadow-primary/30 hover:bg-ucm-navy transition-all active:scale-95 flex items-center disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Save className="h-5 w-5 mr-3" />}
          Save Seeds & Prim Analysis
        </button>
      </div>
    </div>
  );
};
