-- Supprimer l'ancienne politique qui empêche l'ajout de membres
DROP POLICY IF EXISTS "org_members insert self" ON public.org_members;

-- Créer une nouvelle politique qui permet aux membres d'une org d'ajouter d'autres membres
CREATE POLICY "org members can insert in same org" 
ON public.org_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM org_members m 
    WHERE m.org_id = org_members.org_id 
    AND m.user_id = auth.uid()
  )
);

-- Améliorer la politique de sélection pour voir tous les membres de son org
DROP POLICY IF EXISTS "org_members select mine" ON public.org_members;
DROP POLICY IF EXISTS "select my memberships" ON public.org_members;

CREATE POLICY "org members can view org members" 
ON public.org_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM org_members m 
    WHERE m.org_id = org_members.org_id 
    AND m.user_id = auth.uid()
  )
);

-- Ajouter une politique pour la mise à jour des membres de la même org
CREATE POLICY "org members can update org members" 
ON public.org_members 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM org_members m 
    WHERE m.org_id = org_members.org_id 
    AND m.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM org_members m 
    WHERE m.org_id = org_members.org_id 
    AND m.user_id = auth.uid()
  )
);