// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:alfred_client/theme/alfred_theme.dart';
import 'package:alfred_client/widgets/chat_input_bar.dart';

void main() {
  testWidgets('ChatInputBar shows attach button and hides lateral rich icons',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AlfredTheme.light,
        home: Scaffold(
          body: ChatInputBar(
            onSend: (_) async {},
            onSendGif: (_) async {},
            onSendImage: (_, {caption}) async {},
            onSendVideo: (_, {caption}) async {},
            onSendLocation: (_, _) async {},
          ),
        ),
      ),
    );

    expect(find.byIcon(Icons.attach_file_outlined), findsOneWidget);
    expect(find.byIcon(Icons.gif_box_outlined), findsNothing);
    expect(find.byIcon(Icons.location_on_outlined), findsNothing);
    expect(find.byIcon(Icons.mic), findsNothing);
  });

  testWidgets('ChatInputBar rich content panel shows horizontal icon row',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AlfredTheme.light,
        home: Scaffold(
          body: ChatInputBar(
            onSend: (_) async {},
            onSendGif: (_) async {},
            onSendImage: (_, {caption}) async {},
            onSendVideo: (_, {caption}) async {},
            onSendLocation: (_, _) async {},
          ),
        ),
      ),
    );

    await tester.tap(find.byIcon(Icons.attach_file_outlined));
    await tester.pumpAndSettle();

    expect(find.byType(SingleChildScrollView), findsOneWidget);
    expect(find.byIcon(Icons.photo_library_outlined), findsOneWidget);
    expect(find.byIcon(Icons.camera_alt_outlined), findsOneWidget);
    expect(find.byIcon(Icons.videocam_outlined), findsOneWidget);
    expect(find.byIcon(Icons.gif_box_outlined), findsOneWidget);
    expect(find.byIcon(Icons.location_on_outlined), findsOneWidget);
    expect(find.text('Galleria foto'), findsNothing);
  });

  testWidgets('ChatInputBar keeps microphone on the trailing side', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AlfredTheme.light,
        home: Scaffold(
          body: ChatInputBar(
            onSend: (_) async {},
            onSendVoice: (_, _) async {},
          ),
        ),
      ),
    );

    expect(find.byIcon(Icons.mic), findsOneWidget);
    expect(find.byIcon(Icons.attach_file_outlined), findsNothing);
  });
}
