// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:flutter_test/flutter_test.dart';

import 'package:alfred_client/models/profile_summary.dart';
import 'package:alfred_client/providers/reception_allowlist_controller.dart';

import '../support/fake_reception_allowlist_service.dart';

/// Wiring: ReceptionAllowlistController → ReceptionCoordinator → _LiveReceptionEffects.
void main() {
  group('reception wiring', () {
    const ownerId = 'owner-1';
    final alice = ProfileSummary(
      id: 'alice-id',
      username: 'alice',
      displayName: 'Alice',
    );

    test('load attraversa coordinator ed effects live', () async {
      final service = FakeReceptionAllowlistService();
      final controller = ReceptionAllowlistController(
        ownerId: ownerId,
        allowlistService: service,
      );

      for (var i = 0; i < 200 && controller.isLoading; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 5));
      }

      expect(controller.isLoading, isFalse);
      expect(controller.allowedPeople, isEmpty);
    });

    test('addProfile attraversa macchina e service', () async {
      final service = FakeReceptionAllowlistService();
      final controller = ReceptionAllowlistController(
        ownerId: ownerId,
        allowlistService: service,
      );

      for (var i = 0; i < 200 && controller.isLoading; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 5));
      }

      await controller.addProfile(alice);

      expect(service.added, contains(alice));
      expect(controller.allowedProfileIds, contains(alice.id));
    });
  });
}
