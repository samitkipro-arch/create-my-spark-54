-- Ajouter la colonne receipt_number
ALTER TABLE public.recus 
ADD COLUMN IF NOT EXISTS receipt_number integer;

-- Créer une fonction pour obtenir le prochain numéro de reçu par organisation
CREATE OR REPLACE FUNCTION public.get_next_receipt_number(p_org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_number integer;
BEGIN
  SELECT COALESCE(MAX(receipt_number), 0) + 1
  INTO v_next_number
  FROM recus
  WHERE org_id = p_org_id;
  
  RETURN v_next_number;
END;
$$;

-- Créer un trigger pour assigner automatiquement le receipt_number lors de la validation
CREATE OR REPLACE FUNCTION public.assign_receipt_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si le statut passe à 'traite' et qu'il n'y a pas encore de receipt_number
  IF NEW.status = 'traite' AND (OLD.receipt_number IS NULL OR NEW.receipt_number IS NULL) THEN
    NEW.receipt_number := get_next_receipt_number(NEW.org_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur UPDATE
DROP TRIGGER IF EXISTS trigger_assign_receipt_number ON public.recus;
CREATE TRIGGER trigger_assign_receipt_number
  BEFORE UPDATE ON public.recus
  FOR EACH ROW
  EXECUTE FUNCTION assign_receipt_number();

-- Backfill: assigner des numéros séquentiels aux reçus existants avec status='traite'
-- Groupés par org_id et ordonnés par date_traitement puis created_at
DO $$
DECLARE
  r RECORD;
  counter integer;
  current_org uuid;
BEGIN
  current_org := NULL;
  counter := 0;
  
  FOR r IN (
    SELECT id, org_id, date_traitement, created_at
    FROM recus
    WHERE status = 'traite' AND receipt_number IS NULL
    ORDER BY org_id, COALESCE(date_traitement, created_at) ASC
  )
  LOOP
    -- Réinitialiser le compteur pour chaque nouvelle organisation
    IF current_org IS NULL OR current_org != r.org_id THEN
      current_org := r.org_id;
      -- Trouver le max existant pour cette org (au cas où il y en aurait déjà)
      SELECT COALESCE(MAX(receipt_number), 0) INTO counter
      FROM recus
      WHERE org_id = r.org_id;
    END IF;
    
    counter := counter + 1;
    
    UPDATE recus
    SET receipt_number = counter
    WHERE id = r.id;
  END LOOP;
END $$;