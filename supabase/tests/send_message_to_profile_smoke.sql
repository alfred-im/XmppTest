-- Verifica invio messaggio a profilo non in rubrica (RPC unico overload).
-- Esegui via MCP execute_sql sul progetto Alpha.

DO $$
DECLARE
  v_sender uuid := '8a8d7265-f7ab-4473-87aa-978094383215'; -- test2
  v_recipient uuid := '5b9fadb5-884a-41f2-89c9-4ced56be07a2'; -- test1 (non in rubrica test2)
  v_msg public.messages;
  v_cnt int;
BEGIN
  SELECT count(*) INTO v_cnt
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'send_message_to_profile';

  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'Expected 1 send_message_to_profile overload, found %', v_cnt;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_sender::text, 'role', 'authenticated')::text,
    true
  );

  SELECT * INTO v_msg FROM public.send_message_to_profile(
    v_recipient,
    'smoke non-rubrica',
    'smoke-client-id-' || floor(random() * 1000000)::text,
    'text'::public.message_content_type,
    null,
    null,
    null,
    null
  );

  IF v_msg.sender_id <> v_sender OR v_msg.recipient_profile_id <> v_recipient THEN
    RAISE EXCEPTION 'Unexpected message parties: % -> %', v_msg.sender_id, v_msg.recipient_profile_id;
  END IF;

  RAISE NOTICE 'send_message_to_profile_smoke_ok message_id=%', v_msg.id;
END $$;
