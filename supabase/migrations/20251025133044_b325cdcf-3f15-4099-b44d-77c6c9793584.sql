-- Drop the function with CASCADE to remove dependent policies
DROP FUNCTION IF EXISTS public.is_org_member(uuid) CASCADE;

-- Recreate the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.is_org_member(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.org_members m
    WHERE m.org_id = p_org
      AND m.user_id = auth.uid()
      AND m.is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;

-- Recreate org_members policy
CREATE POLICY "org_members_select_self_org" 
ON public.org_members 
FOR SELECT 
USING (is_org_member(org_id));

-- Recreate recus policies
CREATE POLICY "recus_select_member" 
ON public.recus 
FOR SELECT 
USING (is_org_member(org_id));

CREATE POLICY "recus_insert_member" 
ON public.recus 
FOR INSERT 
WITH CHECK (is_org_member(org_id));

CREATE POLICY "recus_update_member" 
ON public.recus 
FOR UPDATE 
USING (is_org_member(org_id))
WITH CHECK (is_org_member(org_id));