-- CRITICAL SECURITY FIX: Enable RLS on all tables
-- Currently all data is publicly accessible!

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

-- Fix function search_path security issues
-- decrement_receipt_credits already has SET search_path = 'public'
-- get_receipt_credits already has SET search_path = 'public'

-- Fix handle_new_user function (missing SET search_path)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
declare
  new_org_id     uuid;
  provided_org   uuid;
  first_name_txt text;
  last_name_txt  text;
  org_name_txt   text;
begin
  -- métadatas envoyées côté front au moment du signUp
  provided_org   := nullif(coalesce((new.raw_user_meta_data->>'organization_id'), ''), '')::uuid;
  first_name_txt := coalesce(new.raw_user_meta_data->>'first_name', '');
  last_name_txt  := coalesce(new.raw_user_meta_data->>'last_name',  '');
  org_name_txt   := coalesce(new.raw_user_meta_data->>'org_name',
                             split_part(new.email,'@',1)); -- fallback simple

  if provided_org is null then
    -- pas d'ID org fourni → on crée une org
    insert into public.orgs (name)
    values (org_name_txt)
    returning id into new_org_id;
  else
    -- un ID org a été fourni → on l'utilise tel quel
    new_org_id := provided_org;
  end if;

  -- créer/compléter le profil
  insert into public.profiles (user_id, first_name, last_name, email, org_id, created_at)
  values (new.id, first_name_txt, last_name_txt, new.email, new_org_id, now())
  on conflict (user_id) do update
    set first_name = excluded.first_name,
        last_name  = excluded.last_name,
        email      = excluded.email,
        org_id     = excluded.org_id;

  -- ajouter le membership
  insert into public.org_members (org_id, user_id, added_at)
  values (new_org_id, new.id, now())
  on conflict do nothing;

  return new;
end;
$function$;

-- Fix set_updated_at function (missing SET search_path)
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
begin 
  new.updated_at = now(); 
  return new; 
end 
$function$;