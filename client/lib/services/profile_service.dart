import '../models/contact.dart';
import 'supabase_bootstrap.dart';

class ProfileService {
  Future<ProfileSearchResult?> findByUsername(String username) async {
    final normalized = username.trim().toLowerCase();
    if (normalized.length < 3) return null;

    final row = await supabase.rpc(
      'find_profile_by_username',
      params: {'p_username': normalized},
    );

    if (row == null) return null;
    if (row is List) {
      if (row.isEmpty) return null;
      return ProfileSearchResult.fromJson(row.first as Map<String, dynamic>);
    }
    return ProfileSearchResult.fromJson(row as Map<String, dynamic>);
  }
}
