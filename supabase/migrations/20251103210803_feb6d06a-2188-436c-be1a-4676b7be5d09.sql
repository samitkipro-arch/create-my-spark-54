-- Créer le profil manquant pour l'utilisateur existant
INSERT INTO public.profiles (user_id, first_name, last_name, email, org_id, receipts_credits, created_at)
VALUES (
  '778e492f-ca9d-4dd0-bd27-a5400b0797cd',
  'Sami',
  'Sami', 
  'samtitki.pro@gmail.com',
  '90570b03-8758-495a-be5f-6b5df048a457', -- org existante
  5,
  now()
)
ON CONFLICT (user_id) DO UPDATE
SET org_id = '90570b03-8758-495a-be5f-6b5df048a457',
    first_name = 'Sami',
    last_name = 'Sami',
    email = 'samtitki.pro@gmail.com';

-- Créer le membership manquant
INSERT INTO public.org_members (org_id, user_id, added_at)
VALUES (
  '90570b03-8758-495a-be5f-6b5df048a457',
  '778e492f-ca9d-4dd0-bd27-a5400b0797cd',
  now()
)
ON CONFLICT DO NOTHING;