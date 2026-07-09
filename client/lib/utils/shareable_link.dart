import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';
import '../models/profile_summary.dart';
import '../theme/alfred_colors.dart';
import 'compose_address.dart';

/// Destinazione di un link condivisibile (`#indirizzo` o `#indirizzo/chat`).
enum ShareableLinkKind { profile, chat }

class ShareableLinkTarget {
  const ShareableLinkTarget({
    required this.address,
    required this.kind,
  });

  /// Indirizzo normalizzato (`username` o `username@server`).
  final String address;
  final ShareableLinkKind kind;
}

/// Risultato parsing indirizzo per risoluzione locale.
class ShareableAddressResolution {
  const ShareableAddressResolution({
    required this.normalizedAddress,
    required this.localUsername,
  });

  final String normalizedAddress;
  final String localUsername;
}

/// Legge il fragment corrente (senza `#`), o `null` se assente.
ShareableLinkTarget? parseShareableFragment(String? fragment) {
  var raw = (fragment ?? '').trim();
  if (raw.startsWith('/')) {
    raw = raw.substring(1);
  }
  if (raw.isEmpty) return null;

  var kind = ShareableLinkKind.profile;
  const chatSuffix = '/chat';
  if (raw.endsWith(chatSuffix)) {
    kind = ShareableLinkKind.chat;
    raw = raw.substring(0, raw.length - chatSuffix.length);
  }

  final resolution = resolveShareableAddress(raw);
  if (resolution == null) return null;

  return ShareableLinkTarget(
    address: resolution.normalizedAddress,
    kind: kind,
  );
}

/// Normalizza e verifica se l'indirizzo è risolvibile su questa istanza.
ShareableAddressResolution? resolveShareableAddress(String raw) {
  final parsed = parseComposeAddress(raw);
  switch (parsed.kind) {
    case ComposeAddressKind.invalid:
      return null;
    case ComposeAddressKind.internalUsername:
      return ShareableAddressResolution(
        normalizedAddress: parsed.normalized,
        localUsername: parsed.normalized,
      );
    case ComposeAddressKind.externalServer:
      final at = parsed.normalized.lastIndexOf('@');
      if (at <= 0) return null;
      final username = parsed.normalized.substring(0, at);
      final server = parsed.normalized.substring(at + 1);
      if (server != AppConfig.imServerId.toLowerCase()) {
        return null;
      }
      if (!RegExp(r'^[a-z0-9_]{3,32}$').hasMatch(username)) {
        return null;
      }
      return ShareableAddressResolution(
        normalizedAddress: parsed.normalized,
        localUsername: username,
      );
  }
}

/// Indirizzo canonico «pulito» per link profilo (preferisce `username` senza server).
String canonicalShareableAddress(ProfileSummary profile) {
  final username = profile.username?.trim().toLowerCase();
  if (username == null || username.isEmpty) {
    throw StateError('Profilo senza username condivisibile');
  }
  return username;
}

/// URL completo con fragment `#indirizzo` (profilo).
String buildShareableProfileUrl(String canonicalAddress) {
  final base = Uri.base;
  final path = base.path.isEmpty
      ? '/'
      : (base.path.endsWith('/') ? base.path : '${base.path}/');
  return Uri(
    scheme: base.scheme,
    host: base.host,
    port: base.hasPort ? base.port : null,
    path: path,
    fragment: canonicalAddress,
  ).toString();
}

extension ProfileSummaryShareable on ProfileSummary {
  String get shareableProfileUrl =>
      buildShareableProfileUrl(canonicalShareableAddress(this));
}

/// Username dal manifest se [profile] non lo espone ancora in UI.
ProfileSummary profileForSharing(
  ProfileSummary profile, {
  String? fallbackUsername,
}) {
  if (profile.hasUsername) return profile;
  final username = fallbackUsername?.trim().toLowerCase();
  if (username == null || username.isEmpty) return profile;
  return profile.copyWith(username: username);
}

/// Invocazione share di sistema sostituibile nei test.
@visibleForTesting
Future<void> Function(ShareParams params)? shareParamsInvokerForTest;

ShareParams _shareParamsForProfileUrl({
  required String url,
  required String title,
  Rect? sharePositionOrigin,
}) {
  return ShareParams(
    uri: Uri.parse(url),
    subject: title,
    sharePositionOrigin: sharePositionOrigin,
    mailToFallbackEnabled: true,
  );
}

/// Apre il foglio Condividi di sistema con il link profilo `#indirizzo`.
Future<void> shareShareableProfileLink(
  BuildContext context,
  ProfileSummary profile, {
  String? shareTitle,
  String? fallbackUsername,
  Rect? sharePositionOrigin,
}) async {
  final shareProfile = profileForSharing(
    profile,
    fallbackUsername: fallbackUsername,
  );

  if (!shareProfile.hasUsername) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Questo profilo non ha un indirizzo condivisibile'),
      ),
    );
    return;
  }

  final url = shareProfile.shareableProfileUrl;
  final title = shareTitle ?? shareProfile.displayName;
  final params = _shareParamsForProfileUrl(
    url: url,
    title: title,
    sharePositionOrigin: sharePositionOrigin,
  );

  try {
    if (shareParamsInvokerForTest != null) {
      await shareParamsInvokerForTest!(params);
      return;
    }

    await SharePlus.instance.share(params);
  } catch (_) {
    if (!context.mounted) return;
    await _showShareFallbackSheet(
      context,
      url: url,
      title: title,
      sharePositionOrigin: sharePositionOrigin,
    );
  }
}

Future<void> _showShareFallbackSheet(
  BuildContext context, {
  required String url,
  required String title,
  Rect? sharePositionOrigin,
}) {
  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (sheetContext) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Condividi profilo',
                style: Theme.of(sheetContext).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 12),
              SelectableText(
                url,
                style: const TextStyle(
                  color: AlfredColors.textSecondary,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () async {
                  Navigator.of(sheetContext).pop();
                  try {
                    await SharePlus.instance.share(
                      _shareParamsForProfileUrl(
                        url: url,
                        title: title,
                        sharePositionOrigin: sharePositionOrigin,
                      ),
                    );
                  } catch (_) {
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'Condivisione non disponibile su questo dispositivo',
                        ),
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.ios_share_outlined, size: 20),
                label: const Text('Condividi…'),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () async {
                  final mailUri = Uri(
                    scheme: 'mailto',
                    queryParameters: {
                      'subject': title,
                      'body': url,
                    },
                  );
                  final launched = await launchUrl(mailUri);
                  if (!launched && sheetContext.mounted) {
                    ScaffoldMessenger.of(sheetContext).showSnackBar(
                      const SnackBar(
                        content: Text('Impossibile aprire il client email'),
                      ),
                    );
                  }
                },
                icon: const Icon(Icons.email_outlined, size: 20),
                label: const Text('Invia via email'),
              ),
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: () async {
                  await Clipboard.setData(ClipboardData(text: url));
                  if (!sheetContext.mounted) return;
                  Navigator.of(sheetContext).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Link copiato negli appunti')),
                  );
                },
                icon: const Icon(Icons.content_copy_outlined, size: 20),
                label: const Text('Copia link'),
              ),
            ],
          ),
        ),
      );
    },
  );
}
