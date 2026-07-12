-- Copyright (C) 2026 im.alfred
--
-- SPDX-License-Identifier: GPL-3.0-or-later

-- Security: helper SECURITY DEFINER non sono API client — solo RPC pubbliche restano su authenticated.
-- Amend SDD 2026-07-07: RECEPTION-ALLOWLIST-REQ-028, GROUP-CORE-REQ-024, GROUP-DELIVERY-REQ-027.

REVOKE ALL ON FUNCTION public.is_sender_allowed_for_reception(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.is_bidirectional_allowed(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.profile_kind_of(uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.erogate_group_message(
  uuid, uuid, uuid, public.contact_protocol, text, public.message_content_type,
  text, integer, text, bigint, double precision, double precision
) FROM PUBLIC, anon, authenticated;
