-- Copyright (C) 2026 im.alfred
--
-- SPDX-License-Identifier: GPL-3.0-or-later

-- Auth: email reale in GoTrue; username obbligatorio in user_metadata (identità IM).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_display_name text;
begin
  v_username := lower(new.raw_user_meta_data ->> 'username');
  v_username := regexp_replace(coalesce(v_username, ''), '[^a-z0-9_]', '_', 'g');

  if length(v_username) < 3 then
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  v_display_name := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    initcap(replace(v_username, '_', ' '))
  );

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_display_name)
  on conflict (id) do nothing;

  return new;
end;
$$;
