-- Copyright (C) 2026 im.alfred
--
-- SPDX-License-Identifier: GPL-3.0-or-later

-- Inbox = solo thread con storico messaggi; lookup profilo per username esatto.

-- ---------------------------------------------------------------------------
-- RPC: profilo Alfred per username esatto (composizione messaggi)
-- ---------------------------------------------------------------------------

create or replace function public.find_profile_by_username(p_username text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and lower(p.username) = lower(trim(p_username))
  limit 1;
$$;

revoke all on function public.find_profile_by_username(text) from public, anon;
grant execute on function public.find_profile_by_username(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Inbox: solo conversazioni con almeno un messaggio (last_message_at)
-- ---------------------------------------------------------------------------

create or replace function public.list_conversations()
returns table (
  conversation_id uuid,
  protocol public.contact_protocol,
  display_name text,
  last_message_preview text,
  last_message_at timestamptz,
  unread_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select auth.uid() as uid
  )
  select
    c.id as conversation_id,
    c.protocol,
    coalesce(
      nullif(trim(c.title), ''),
      peer.display_name,
      'Conversazione'
    ) as display_name,
    coalesce(c.last_message_preview, '') as last_message_preview,
    c.last_message_at,
    cp.unread_count
  from me
  cross join public.conversation_participants cp
  inner join public.conversations c on c.id = cp.conversation_id
  left join lateral (
    select coalesce(p.display_name, ct.display_name, 'Contatto') as display_name
    from public.conversation_participants op
    left join public.profiles p on p.id = op.profile_id
    left join public.contacts ct on ct.id = op.contact_id
    where op.conversation_id = c.id
      and op.profile_id <> me.uid
    limit 1
  ) peer on true
  where cp.profile_id = me.uid
    and me.uid is not null
    and c.last_message_at is not null
  order by c.last_message_at desc nulls last;
$$;

grant execute on function public.list_conversations() to authenticated;
revoke all on function public.list_conversations() from anon;
