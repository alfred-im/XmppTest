-- GoTrue allowlist: email sintetica alfred.{username}@gmail.com (mai mostrata in UI).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_display_name text;
  v_local text;
begin
  v_username := lower(new.raw_user_meta_data ->> 'username');

  if v_username is null or v_username = '' then
    v_local := split_part(new.email, '@', 1);
    if new.email like 'alfred.%@gmail.com' then
      v_username := lower(substring(v_local from 8)); -- dopo 'alfred.'
    elsif new.email like '%@users.alfred.app'
       or new.email like '%@users.alfred.internal' then
      v_username := lower(v_local);
    end if;
  end if;

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
