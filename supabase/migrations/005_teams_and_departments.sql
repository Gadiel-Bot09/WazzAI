-- Migration 005: Teams and Departments

-- 1. Create departments table
CREATE TABLE public.departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their org departments" ON public.departments
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.users WHERE users.id = auth.uid()));
CREATE POLICY "Admins can insert departments" ON public.departments
  FOR INSERT WITH CHECK (org_id IN (SELECT org_id FROM public.users WHERE users.id = auth.uid()));
CREATE POLICY "Admins can update departments" ON public.departments
  FOR UPDATE USING (org_id IN (SELECT org_id FROM public.users WHERE users.id = auth.uid()));
CREATE POLICY "Admins can delete departments" ON public.departments
  FOR DELETE USING (org_id IN (SELECT org_id FROM public.users WHERE users.id = auth.uid()));


-- 2. Create team_members table
CREATE TABLE public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(org_id, user_id)
);

-- RLS for team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their org team members" ON public.team_members
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.users WHERE users.id = auth.uid()));
CREATE POLICY "Admins can insert team members" ON public.team_members
  FOR INSERT WITH CHECK (org_id IN (SELECT org_id FROM public.users WHERE users.id = auth.uid()));
CREATE POLICY "Admins can update team members" ON public.team_members
  FOR UPDATE USING (org_id IN (SELECT org_id FROM public.users WHERE users.id = auth.uid()));
CREATE POLICY "Admins can delete team members" ON public.team_members
  FOR DELETE USING (org_id IN (SELECT org_id FROM public.users WHERE users.id = auth.uid()));


-- 3. Modify conversations table
ALTER TABLE public.conversations 
ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- 4. Initial migration: make all existing users 'admin' in team_members
INSERT INTO public.team_members (org_id, user_id, role)
SELECT org_id, id as user_id, 'admin' as role FROM public.users
ON CONFLICT (org_id, user_id) DO NOTHING;
