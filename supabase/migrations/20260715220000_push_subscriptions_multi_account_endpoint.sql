-- Copyright (C) 2026 im.alfred
--
-- SPDX-License-Identifier: GPL-3.0-or-later

-- SYS-PUSH-003: stesso endpoint FCM può servire più account Alfred sullo stesso device.

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_endpoint_unique;

alter table public.push_subscriptions
  add constraint push_subscriptions_user_endpoint_unique
  unique (user_id, endpoint);
