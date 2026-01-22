'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Trash2, Tag } from 'lucide-react';

interface Code {
  id: string;
  code_text: string;
}

interface Theme {
  id: string;
  theme_name: string;
  codes: Code[];
}

interface ThemeBuilderProps {
  projectId: string;
}

const SortableItem = ({ id, text }: { id: string, text: string }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center p-3 mb-3 bg-white border border-gray-100 rounded-2xl shadow-sm group hover:border-primary transition-all active:scale-[0.98]"
    >
      <div {...attributes} {...listeners} className="cursor-grab p-2 text-gray-300 group-hover:text-primary transition-colors">
        <GripVertical size={16} />
      </div>
      <span className="text-xs font-black text-ucm-navy uppercase tracking-tight ml-1">{text}</span>
    </div>
  );
};

export const ThemeBuilder: React.FC<ThemeBuilderProps> = ({ projectId }) => {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [unassignedCodes, setUnassignedCodes] = useState<Code[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchData = async () => {
    // Fetch themes and their codes
    const { data: themesData } = await supabase
      .from('themes')
      .select('id, theme_name')
      .eq('project_id', projectId);

    const { data: junctionData } = await supabase
      .from('code_theme')
      .select('theme_id, codes(id, code_text)');

    // Fetch all codes for this project
    const { data: allCodes } = await supabase
      .from('codes')
      .select('id, code_text')
      .eq('project_id', projectId);

    const formattedThemes = (themesData || []).map(t => ({
      ...t,
      codes: (junctionData || [])
        .filter(j => j.theme_id === t.id)
        .map(j => (j.codes as unknown as Code))
    }));

    // Find unassigned codes
    const assignedCodeIds = new Set(junctionData?.map(j => (j.codes as any).id));
    const unassigned = (allCodes || []).filter(c => !assignedCodeIds.has(c.id));

    setThemes(formattedThemes);
    setUnassignedCodes(unassigned);
  };

  useEffect(() => {
    if (projectId) fetchData();
  }, [projectId]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string) || (over.id as string);

    if (activeContainer && overContainer && activeContainer !== overContainer) {
      // Logic to move between containers
      moveBetweenContainers(activeContainer, overContainer, active.id as string, over.id as string);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string) || (over.id as string);

    if (activeContainer && overContainer) {
      // Update database
      if (overContainer !== 'unassigned') {
        await supabase
          .from('code_theme')
          .upsert({ code_id: active.id, theme_id: overContainer }, { onConflict: 'code_id,theme_id' });
      } else {
        await supabase
          .from('code_theme')
          .delete()
          .eq('code_id', active.id);
      }
    }

    setActiveId(null);
  };

  const findContainer = (id: string) => {
    if (unassignedCodes.some(c => c.id === id)) return 'unassigned';
    const theme = themes.find(t => t.codes.some(c => c.id === id));
    return theme ? theme.id : null;
  };

  const moveBetweenContainers = (activeContainer: string, overContainer: string, activeId: string, overId: string) => {
    // UI update logic (omitted for brevity, but would involve updating themes/unassignedCodes state)
    // In a real app, you'd update state here for immediate feedback
    fetchData(); // Refresh for now to keep it simple and consistent with DB
  };

  const createTheme = async () => {
    const name = prompt('Theme Name:');
    if (!name) return;
    await supabase.from('themes').insert({ project_id: projectId, theme_name: name });
    fetchData();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-ucm-navy tracking-tight uppercase">Theme Builder</h2>
        <button 
          onClick={createTheme}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-xl text-xs font-black hover:bg-ucm-navy transition-all active:scale-95 uppercase tracking-widest"
        >
          <Plus className="h-4 w-4 mr-1" /> New Theme
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Unassigned Codes */}
          <div className="flex flex-col bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 min-h-[300px]">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center">
              <Tag className="h-4 w-4 mr-2 text-primary" /> Unassigned Codes
            </h3>
            <SortableContext items={unassignedCodes.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="flex-1" id="unassigned">
                {unassignedCodes.map(code => (
                  <SortableItem key={code.id} id={code.id} text={code.code_text} />
                ))}
              </div>
            </SortableContext>
          </div>

          {/* Theme Containers */}
          {themes.map((theme, index) => (
            <div key={theme.id} className="flex flex-col bg-white p-6 rounded-[32px] border border-gray-100 shadow-xl shadow-primary/5 min-h-[300px] relative overflow-hidden group hover:border-primary transition-colors">
              <div className="absolute top-0 left-0 w-full h-1 bg-ucm-gold opacity-0 group-hover:opacity-100 transition-opacity" />
              <h3 className="text-xs font-black text-ucm-navy uppercase tracking-widest mb-6 border-b border-gray-50 pb-4">{theme.theme_name}</h3>
              <SortableContext items={theme.codes.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div className="flex-1" id={theme.id}>
                  {theme.codes.map(code => (
                    <SortableItem key={code.id} id={code.id} text={code.code_text} />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  );
};
