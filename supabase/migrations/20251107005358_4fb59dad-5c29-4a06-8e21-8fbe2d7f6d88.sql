-- Update handle_new_user trigger to set owner_id on newly created orgs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    -- pas d'ID org fourni → on crée une org avec owner_id
    insert into public.orgs (name, owner_id)
    values (org_name_txt, new.id)
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

  -- ajouter le membership avec role 'member'
  insert into public.org_members (org_id, user_id, added_at)
  values (new_org_id, new.id, now())
  on conflict do nothing;

  return new;
end;
$function$;