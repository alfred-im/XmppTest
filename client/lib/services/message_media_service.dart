import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import 'supabase_bootstrap.dart';

class MessageMediaService {
  const MessageMediaService();

  Future<String> uploadGif({
    required Uint8List bytes,
    required String userId,
  }) async {
    final path = '$userId/${const Uuid().v4()}.gif';
    await supabase.storage.from('chat-media').uploadBinary(
          path,
          bytes,
          fileOptions: const FileOptions(
            contentType: 'image/gif',
            upsert: false,
          ),
        );
    return supabase.storage.from('chat-media').getPublicUrl(path);
  }
}
