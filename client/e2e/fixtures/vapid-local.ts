// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Coppia VAPID fissa solo per e2e push su stack locale (supabase start).
 * Non usare in produzione — il client hosted usa AppConfig.vapidPublicKey.
 */
export const LOCAL_VAPID_PUBLIC_KEY =
  'BJxl1YXCAzWVKwMp3DmFoVgMzDoyWcBTLsL01MRwYPpQawss7vVUtHZW5r6fCxKfUMIkK8PTwTruf_W-M5T-oUI';

export const LOCAL_VAPID_PRIVATE_KEY =
  'CqovlWoDdFcage2Lwa69iR3sscl69rpkqFkyN8xsNq8';

export const LOCAL_VAPID_SUBJECT = 'mailto:push-e2e@alfred.local';
