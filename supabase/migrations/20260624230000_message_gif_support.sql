-- GIF / media in chat: content_type + media_url, storage bucket, RPC aggiornata.

create type public.message_content_type as enum ('text', 'gif');

alter table public.messages
  add column content_type public.message_content_type not null default 'text',
  add column media_url text;

alter table public.messages
  add constraint messages_gif_requires_url check (
    content_type <> 'gif' or (media_url is not null and length(trim(media_url)) > 0)
  );

-- ---------------------------------------------------------------------------
-- Trigger preview: etichetta [GIF] per messaggi animati
-- ---------------------------------------------------------------------------

create or replace function public.on_message_inserted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_protocol public.contact_protocol;
  v_preview text;
begin
  select c.protocol into v_protocol
  from public.conversations c
  where c.id = new.conversation_id;

  if new.content_type = 'gif' then
    v_preview := '[GIF]';
  else
    v_preview := left(trim(new.body), 120);
    if v_preview = '' and new.marker_type is not null then
      v_preview := '[stato messaggio]';
    end if;
  end if;

  update public.conversations
  set
    last_message_at = new.created_at,
    last_message_preview = v_preview,
    last_message_sender_id = new.sender_id,
    updated_at = now()
  where id = new.conversation_id;

  update public.conversation_participants
  set unread_count = unread_count + 1
  where conversation_id = new.conversation_id
    and profile_id <> new.sender_id;

  if v_protocol in ('xmpp', 'matrix') then
    update public.messages
    set delivery_status = 'pending'
    where id = new.id;

    insert into public.outbox (message_id, conversation_id, protocol, payload)
    values (
      new.id,
      new.conversation_id,
      v_protocol,
      jsonb_build_object(
        'body', new.body,
        'content_type', new.content_type,
        'media_url', new.media_url,
        'sender_id', new.sender_id,
        'client_message_id', new.client_message_id
      )
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: invio messaggio (testo o GIF)
-- ---------------------------------------------------------------------------

create or replace function public.send_message(
  p_conversation_id uuid,
  p_body text default '',
  p_client_message_id text default null,
  p_content_type public.message_content_type default 'text',
  p_media_url text default null
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_row public.messages;
  v_body text := coalesce(p_body, '');
  v_media_url text := nullif(trim(coalesce(p_media_url, '')), '');
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_conversation_participant(p_conversation_id) then
    raise exception 'not a participant';
  end if;

  if p_content_type = 'text' then
    if length(trim(v_body)) = 0 then
      raise exception 'empty message';
    end if;
  elsif p_content_type = 'gif' then
    if v_media_url is null then
      raise exception 'gif requires media_url';
    end if;
  else
    raise exception 'unsupported content_type';
  end if;

  insert into public.messages (
    conversation_id,
    sender_id,
    body,
    client_message_id,
    delivery_status,
    content_type,
    media_url
  )
  values (
    p_conversation_id,
    v_me,
    trim(v_body),
    p_client_message_id,
    'sent',
    p_content_type,
    v_media_url
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- mark_conversation_read: conta anche GIF (body può essere vuoto)
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_conversation_participant(p_conversation_id) then
    raise exception 'not a participant';
  end if;

  update public.conversation_participants
  set unread_count = 0, last_read_at = now()
  where conversation_id = p_conversation_id and profile_id = v_me;

  insert into public.message_read_receipts (message_id, profile_id, status)
  select m.id, v_me, 'read'::public.message_delivery_status
  from public.messages m
  where m.conversation_id = p_conversation_id
    and m.sender_id <> v_me
    and m.marker_type is null
    and (
      trim(m.body) <> ''
      or m.content_type = 'gif'
    )
  on conflict do nothing;

  update public.messages m
  set delivery_status = 'read'
  from public.conversation_participants cp
  where m.conversation_id = p_conversation_id
    and m.sender_id = v_me
    and cp.conversation_id = p_conversation_id
    and cp.profile_id <> v_me
    and cp.last_read_at is not null
    and m.created_at <= cp.last_read_at
    and m.delivery_status in ('sent', 'delivered');
end;
$$;

revoke all on function public.send_message(uuid, text, text, public.message_content_type, text) from public, anon;
grant execute on function public.send_message(uuid, text, text, public.message_content_type, text) to authenticated;

-- Compatibilità overload precedente (3 argomenti)
revoke all on function public.send_message(uuid, text, text) from public, anon;
grant execute on function public.send_message(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: bucket chat-media (GIF upload)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  true,
  10485760,
  array['image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy chat_media_select_authenticated
  on storage.objects for select to authenticated
  using (bucket_id = 'chat-media');

create policy chat_media_insert_own_folder
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy chat_media_update_own_folder
  on storage.objects for update to authenticated
  using (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy chat_media_delete_own_folder
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
