'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Loader2, FolderPlus } from 'lucide-react';

interface CreateProjectProps {
  onProjectCreated: (project: any) => void;
}

export const CreateProject: React.FC<CreateProjectProps> = ({ onProjectCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('You must be logged in to create a project');
      }

      const { data, error: insertError } = await supabase
        .from('projects')
        .insert([
          { 
            name, 
            description, 
            user_id: user.id 
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      setName('');
      setDescription('');
      onProjectCreated(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-1">
      <form onSubmit={handleCreate} className="space-y-5">
        <div>
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Project Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-gray-900 font-bold placeholder:text-gray-300"
            placeholder="e.g., Student Experience Analysis"
          />
        </div>
        <div>
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-gray-900 font-bold placeholder:text-gray-300 resize-none"
            placeholder="Describe the goals of this thematic analysis..."
            rows={4}
          />
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-black uppercase tracking-widest">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isCreating}
          className="w-full flex items-center justify-center px-4 py-5 bg-primary text-white rounded-2xl font-black hover:bg-ucm-navy transition-all shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 uppercase tracking-widest text-sm"
        >
          {isCreating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <FolderPlus className="h-5 w-5 mr-2" /> Create Research Project
            </>
          )}
        </button>
      </form>
    </div>
  );
};
