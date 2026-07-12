-- Copyright (C) 2026 im.alfred
--
-- SPDX-License-Identifier: GPL-3.0-or-later

-- Alfred platform: bootstrap migration (scope attuale)
-- Apply after linking this repo to your Supabase project (dashboard or supabase link).

create extension if not exists "pgcrypto" with schema extensions;
