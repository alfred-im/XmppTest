-- Copyright (C) 2026 im.alfred
--
-- SPDX-License-Identifier: GPL-3.0-or-later

-- Hosted deploy: VAPID + dispatch secret in push_settings (service_role RPC fallback)

alter table alfred_delivery.push_settings
  add column if not exists vapid_public_key text,
  add column if not exists vapid_private_key text,
  add column if not exists vapid_subject text not null default 'mailto:push@alfred.app';

create or replace function public.internal_push_dispatch_config()
returns jsonb
language sql
security definer
set search_path = alfred_delivery, public
as $$
  select jsonb_build_object(
    'vapid_public_key', vapid_public_key,
    'vapid_private_key', vapid_private_key,
    'vapid_subject', vapid_subject,
    'dispatch_secret', dispatch_secret
  )
  from alfred_delivery.push_settings
  where singleton = true;
$$;

revoke all on function public.internal_push_dispatch_config() from public, anon, authenticated;
grant execute on function public.internal_push_dispatch_config() to service_role;
