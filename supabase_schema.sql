-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    analysis_status TEXT DEFAULT 'idle', -- 'idle', 'processing', 'completed', 'error'
    analysis_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT,
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document Rows table (individual segments)
CREATE TABLE IF NOT EXISTS public.document_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Codes table
CREATE TABLE IF NOT EXISTS public.codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    row_id UUID REFERENCES public.document_rows(id) ON DELETE CASCADE,
    code_text TEXT NOT NULL,
    sentiment_score FLOAT DEFAULT 0,
    manual_theme_id UUID REFERENCES public.themes(id) ON DELETE SET NULL,
    embedding VECTOR(384), -- Dimension for all-MiniLM-L6-v2
    x FLOAT,
    y FLOAT,
    cluster_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Themes table
CREATE TABLE IF NOT EXISTS public.themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    theme_name TEXT NOT NULL,
    description TEXT,
    seed_words TEXT[], 
    is_user_defined BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Code-Theme Junction table
CREATE TABLE IF NOT EXISTS public.code_theme (
    code_id UUID NOT NULL REFERENCES public.codes(id) ON DELETE CASCADE,
    theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
    PRIMARY KEY (code_id, theme_id)
);

-- Profiles table for usernames
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_theme ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (assuming Supabase Auth user_id)
CREATE POLICY "Users can manage their own projects" ON public.projects
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage documents of their projects" ON public.documents
    FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage document_rows of their projects" ON public.document_rows
    FOR ALL USING (document_id IN (SELECT d.id FROM public.documents d JOIN public.projects p ON d.project_id = p.id WHERE p.user_id = auth.uid()));

CREATE POLICY "Users can manage codes of their projects" ON public.codes
    FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage themes of their projects" ON public.themes
    FOR ALL USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage code_theme links" ON public.code_theme
    FOR ALL USING (code_id IN (SELECT c.id FROM public.codes c JOIN public.projects p ON c.project_id = p.id WHERE p.user_id = auth.uid()));

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Trigger to handle new user signup automatically
-- This ensures the profile is created even if the frontend call fails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (
        new.id, 
        COALESCE(
            new.raw_user_meta_data->>'username', 
            new.raw_user_meta_data->>'preferred_username',
            new.raw_user_meta_data->>'full_name',
            split_part(new.email, '@', 1)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
