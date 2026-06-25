/// Mapping username ↔ identificatore GoTrue (email interna, mai mostrata in UI).
class AuthIdentity {
  AuthIdentity._();

  /// GoTrue (2025+) accetta solo domini su allowlist (gmail, outlook, …).
  /// Email sintetica: alfred.{username}@gmail.com — non è una casella reale.
  static const internalEmailLocalPrefix = 'alfred.';
  static const internalEmailDomain = 'gmail.com';

  static final usernamePattern = RegExp(r'^[a-z0-9_]{3,32}$');

  static String normalizeUsername(String input) => input.trim().toLowerCase();

  static bool isValidUsername(String username) =>
      usernamePattern.hasMatch(username);

  static String? validateUsername(String input) {
    final normalized = normalizeUsername(input);
    if (normalized.isEmpty) return 'Inserisci un username';
    if (!isValidUsername(normalized)) {
      return 'Username: 3–32 caratteri, solo lettere minuscole, numeri e _';
    }
    return null;
  }

  static String internalAuthEmail(String username) {
    final normalized = normalizeUsername(username);
    return '$internalEmailLocalPrefix$normalized@$internalEmailDomain';
  }

  /// Estrae lo username dall'email interna della sessione Supabase.
  static String? usernameFromAuthEmail(String? email) {
    if (email == null || email.isEmpty) return null;

    final at = email.lastIndexOf('@');
    if (at <= 0) return null;
    final local = email.substring(0, at);
    final domain = email.substring(at + 1);

    if (domain == internalEmailDomain &&
        local.startsWith(internalEmailLocalPrefix)) {
      final username = local.substring(internalEmailLocalPrefix.length);
      return username.isEmpty ? null : username;
    }

    // Legacy domini fittizi (pre-fix allowlist).
    const legacyDomains = ['users.alfred.app', 'users.alfred.internal'];
    for (final legacy in legacyDomains) {
      if (domain == legacy) {
        return local.isEmpty ? null : local;
      }
    }

    return null;
  }
}
