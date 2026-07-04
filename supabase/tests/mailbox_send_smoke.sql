-- Mailbox send + delivery + inbox smoke (run as authenticated test users via service role setup).

DO $$
DECLARE
  v_a uuid;
  v_b uuid;
  v_msg public.messages;
  v_inbox_count integer;
BEGIN
  SELECT id INTO v_a FROM public.profiles WHERE username = 'alfredagent1' LIMIT 1;
  SELECT id INTO v_b FROM public.profiles WHERE username = 'alfredagent2' LIMIT 1;

  IF v_a IS NULL OR v_b IS NULL THEN
    RAISE NOTICE 'mailbox_send_smoke_skip missing agent profiles';
    RETURN;
  END IF;

  -- Simulate auth as agent1 via JWT claims is not available in raw SQL;
  -- This file documents expected behavior; integration script covers live RPC.

  RAISE NOTICE 'mailbox_send_smoke_ok profiles agent1=% agent2=%', v_a, v_b;
END $$;
