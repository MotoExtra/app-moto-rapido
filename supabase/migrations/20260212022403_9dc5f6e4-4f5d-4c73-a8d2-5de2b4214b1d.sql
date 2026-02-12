
-- Create atomic function to accept an offer with race condition protection
CREATE OR REPLACE FUNCTION public.try_accept_offer(p_user_id uuid, p_offer_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accepted_id uuid;
BEGIN
  -- Verify caller is the user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Lock on user to prevent concurrent acceptances by same user
  PERFORM pg_advisory_xact_lock(hashtext('user_accept_' || p_user_id::text));

  -- Check if user already has an active extra
  IF EXISTS (
    SELECT 1 FROM accepted_offers
    WHERE user_id = p_user_id
      AND status IN ('pending', 'arrived', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'Você já tem um extra ativo. Finalize ou cancele antes de aceitar outro.';
  END IF;

  -- Check if offer is still available
  IF NOT EXISTS (
    SELECT 1 FROM offers
    WHERE id = p_offer_id
      AND is_accepted = false
  ) THEN
    RAISE EXCEPTION 'Este extra já foi aceito por outro motoboy.';
  END IF;

  -- Lock on offer to prevent concurrent acceptances of same offer
  PERFORM pg_advisory_xact_lock(hashtext('offer_accept_' || p_offer_id::text));

  -- Update offer as accepted
  UPDATE offers
  SET is_accepted = true, accepted_by = p_user_id, updated_at = now()
  WHERE id = p_offer_id AND is_accepted = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Este extra já foi aceito por outro motoboy.';
  END IF;

  -- Create accepted_offers record
  INSERT INTO accepted_offers (user_id, offer_id, status)
  VALUES (p_user_id, p_offer_id, 'pending')
  RETURNING id INTO v_accepted_id;

  RETURN v_accepted_id;
END;
$$;
