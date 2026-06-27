-- PostgREST restituisce HTTP 300 (Multiple Choices) quando esistono due overload
-- con la stessa firma visibile al client (uuid, text, text).
-- Il client invia solo p_recipient_profile_id, p_body, p_client_message_id per il testo.
-- Manteniamo la funzione plpgsql con parametri opzionali (default content_type = text).

drop function if exists public.send_message_to_profile(uuid, text, text);
