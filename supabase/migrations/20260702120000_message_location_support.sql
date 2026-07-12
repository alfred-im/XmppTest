-- Copyright (C) 2026 im.alfred
--
-- SPDX-License-Identifier: GPL-3.0-or-later

-- Static location sharing (part 1/2): enum value must commit before use in constraints/RPC.

alter type public.message_content_type add value if not exists 'location';
