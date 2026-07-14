-- Copyright (C) 2026 im.alfred
--
-- SPDX-License-Identifier: GPL-3.0-or-later

-- SYS-PUSH: multiple device subscriptions per user

DO $$
DECLARE
  v_agent1 uuid := 'efd885fe-b36e-48fc-a796-0e3f153e40d6';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_agent1) THEN
    RAISE NOTICE 'push_multi_device_smoke_skip missing agent1';
    RETURN;
  END IF;

  INSERT INTO public.push_subscriptions (
    user_id, device_id, endpoint, p256dh_key, auth_key
  )
  VALUES
    (
      v_agent1,
      '22222222-2222-4222-8222-222222222222',
      'https://push.test/device-a',
      'k1',
      'a1'
    ),
    (
      v_agent1,
      '33333333-3333-4333-8333-333333333333',
      'https://push.test/device-b',
      'k2',
      'a2'
    )
  ON CONFLICT (user_id, device_id) DO UPDATE
    SET last_seen_at = now();

  IF (
    SELECT count(*) FROM public.push_subscriptions WHERE user_id = v_agent1
  ) < 2 THEN
    RAISE EXCEPTION 'expected at least two subscriptions for agent1';
  END IF;

  RAISE NOTICE 'push_multi_device_smoke_ok';
END $$;
