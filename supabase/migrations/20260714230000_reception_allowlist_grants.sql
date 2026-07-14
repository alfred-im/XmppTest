-- Copyright (C) 2026 im.alfred
--
-- SPDX-License-Identifier: GPL-3.0-or-later

-- SYS-RECEPTION: PostgREST su reception_allowlist (RLS già definita in 20260704130000).

grant select, insert, delete on public.reception_allowlist to authenticated;
