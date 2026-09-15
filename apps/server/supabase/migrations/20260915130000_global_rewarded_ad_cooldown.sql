-- Keep the server-side pack reservation aligned with the app-wide rewarded-ad cooldown.
CREATE OR REPLACE FUNCTION public.reserve_game_pack_ad(
  p_user_id bigint,
  p_request_id text,
  p_card_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user public.users%ROWTYPE;
  v_card public.cards%ROWTYPE;
  v_owned_count integer;
  v_started_at timestamptz;
  v_replayed boolean := false;
BEGIN
  IF p_request_id !~ '^[A-Za-z0-9._:-]{8,100}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST_ID';
  END IF;

  SELECT * INTO v_user
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;

  IF v_user.pack_opened_on = current_date AND v_user.pack_open_count >= 20 THEN
    RAISE EXCEPTION 'DAILY_PACK_LIMIT_REACHED';
  END IF;

  SELECT count(*)::integer INTO v_owned_count
  FROM public.user_cards
  WHERE user_id = p_user_id;
  IF v_owned_count >= 5 THEN RAISE EXCEPTION 'CARD_STORAGE_FULL'; END IF;

  IF v_user.pack_pending_card_id IS NOT NULL THEN
    SELECT * INTO v_card
    FROM public.cards
    WHERE id = v_user.pack_pending_card_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'CARD_TEMPLATE_NOT_FOUND'; END IF;

    v_replayed := true;
    IF v_user.pack_ad_request_id = p_request_id
       AND v_user.pack_ad_started_at IS NOT NULL
       AND now() < v_user.pack_ad_started_at + interval '10 minutes' THEN
      v_started_at := v_user.pack_ad_started_at;
    ELSE
      v_started_at := now();
      UPDATE public.users
      SET pack_ad_started_at = v_started_at,
          pack_ad_request_id = p_request_id
      WHERE id = p_user_id;
    END IF;
  ELSE
    IF v_user.pack_ad_started_at IS NOT NULL
       AND now() < v_user.pack_ad_started_at + interval '20 seconds' THEN
      RAISE EXCEPTION 'PACK_OPEN_COOLDOWN_ACTIVE';
    END IF;

    SELECT * INTO v_card FROM public.cards WHERE id = p_card_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'CARD_TEMPLATE_NOT_FOUND'; END IF;

    v_started_at := now();
    UPDATE public.users
    SET pack_ad_started_at = v_started_at,
        pack_ad_request_id = p_request_id,
        pack_pending_card_id = v_card.id
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'imageKey', COALESCE(v_card.image_path, ''),
    'startedAt', v_started_at,
    'nextAvailableAt', v_started_at + interval '20 seconds',
    'replayed', v_replayed
  );
END;
$function$;

