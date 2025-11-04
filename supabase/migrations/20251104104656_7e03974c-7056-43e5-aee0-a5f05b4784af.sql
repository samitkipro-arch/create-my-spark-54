-- 1. Supprimer la contrainte de clé étrangère sur user_id
ALTER TABLE public.org_members 
DROP CONSTRAINT IF EXISTS org_members_user_id_fkey;

-- 2. Ajouter un champ id comme nouvelle clé primaire
ALTER TABLE public.org_members 
DROP CONSTRAINT IF EXISTS org_members_pkey;

ALTER TABLE public.org_members 
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();

-- 3. Créer la nouvelle clé primaire sur id
ALTER TABLE public.org_members 
ADD PRIMARY KEY (id);

-- 4. Rendre user_id nullable pour permettre des membres sans compte auth
ALTER TABLE public.org_members 
ALTER COLUMN user_id DROP NOT NULL;

-- 5. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id) WHERE user_id IS NOT NULL;