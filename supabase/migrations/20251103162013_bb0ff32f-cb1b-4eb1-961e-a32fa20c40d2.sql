-- Ajouter la colonne receipts_credits sur la table profiles
ALTER TABLE public.profiles
ADD COLUMN receipts_credits integer NOT NULL DEFAULT 5;

-- Mettre à jour tous les profils existants pour avoir 5 crédits
UPDATE public.profiles
SET receipts_credits = 5;

-- Créer une fonction pour décrémenter les crédits de reçus
CREATE OR REPLACE FUNCTION public.decrement_receipt_credits(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits integer;
BEGIN
  -- Récupérer les crédits actuels
  SELECT receipts_credits INTO v_credits
  FROM profiles
  WHERE user_id = p_user_id;
  
  -- Vérifier qu'il reste des crédits
  IF v_credits <= 0 THEN
    RAISE EXCEPTION 'No receipt credits remaining';
  END IF;
  
  -- Décrémenter les crédits
  UPDATE profiles
  SET receipts_credits = receipts_credits - 1
  WHERE user_id = p_user_id;
  
  -- Retourner le nouveau nombre de crédits
  RETURN v_credits - 1;
END;
$$;

-- Créer une fonction pour vérifier les crédits disponibles
CREATE OR REPLACE FUNCTION public.get_receipt_credits(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits integer;
BEGIN
  SELECT receipts_credits INTO v_credits
  FROM profiles
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_credits, 0);
END;
$$;