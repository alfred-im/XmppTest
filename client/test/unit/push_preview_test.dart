// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:alfred_client/models/message.dart';
import 'package:alfred_client/utils/message_preview.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('push preview', () {
    test('text preview matches inbox', () {
      final message = ChatMessage(
        id: '1',
        body: 'Ciao mondo',
        timeLabel: '12:00',
        isMine: false,
        contentType: MessageContentType.text,
      );
      expect(inboxPreviewForMessage(message), 'Ciao mondo');
    });

    test('media previews', () {
      expect(
        inboxPreviewForMessage(
          const ChatMessage(
            id: '1',
            body: '',
            timeLabel: '12:00',
            isMine: false,
            contentType: MessageContentType.gif,
          ),
        ),
        '[GIF]',
      );
      expect(
        inboxPreviewForMessage(
          const ChatMessage(
            id: '1',
            body: 'didascalia',
            timeLabel: '12:00',
            isMine: false,
            contentType: MessageContentType.image,
          ),
        ),
        '📷 didascalia',
      );
    });
  });
}
