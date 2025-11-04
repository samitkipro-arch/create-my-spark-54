-- Supprimer les politiques qui causent la récursion
DROP POLICY IF EXISTS "org members can insert in same org" ON public.org_members;
DROP POLICY IF EXISTS "org members can view org members" ON public.org_members;
DROP POLICY IF EXISTS "org members can update org members" ON public.org_members;

-- Créer une fonction security definer pour obtenir l'org_id de l'utilisateur
-- Cette fonction ne déclenche pas les politiques RLS
CREATE OR REPLACE FUNCTION public.get_user_org_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id 
  FROM profiles 
  WHERE user_id = p_user_id
  LIMIT 1;
$$;

-- Politique INSERT : permet d'insérer si même org_id
CREATE POLICY "org_members_insert_same_org" 
ON public.org_members 
FOR INSERT 
WITH CHECK (
  org_id = public.get_user_org_id(auth.uid())
);

-- Politique SELECT : permet de voir les membres de la même org
CREATE POLICY "org_members_select_same_org" 
ON public.org_members 
FOR SELECT 
USING (
  org_id = public.get_user_org_id(auth.uid())
);

-- Politique UPDATE : permet de modifier les membres de la même org
CREATE POLICY "org_members_update_same_org" 
ON public.org_members 
FOR UPDATE 
USING (
  org_id = public.get_user_org_id(auth.uid())
)
WITH CHECK (
  org_id = public.get_user_org_id(auth.uid())
);

-- Politique DELETE : permet de supprimer les membres de la même org
CREATE POLICY "org_members_delete_same_org" 
ON public.org_members 
FOR DELETE 
USING (
  org_id = public.get_user_org_id(auth.uid())
);