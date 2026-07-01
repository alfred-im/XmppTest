@Tags(['live'])
library;

import 'package:shared_preferences/shared_preferences.dart';
import 'package:test/test.dart';

import 'package:alfred_client/services/account_manager.dart';
import 'package:alfred_client/services/account_storage_service.dart';

/// Credenziali agente — docs/AGENT_DEBUG_ACCOUNTS.md
const _agent1Email = 'agadriel.sexpositive+alfredagent1@gmail.com';
const _agent1Pass = 'AlfredAgentDbg1!';
const _agent2Email = 'agadriel.sexpositive+alfredagent2@gmail.com';
const _agent2Pass = 'AlfredAgentDbg2!';

void main() {
  group('multi-account persist (live Supabase)', () {
    late AccountStorageService storage;
    late AccountManager manager;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      storage = AccountStorageService();
      manager = AccountManager(storage: storage);
    });

    tearDown(() async {
      await manager.dispose();
    });

    test('login two accounts then storage has both (refresh scenario)', () async {
      await manager.openWithPassword(email: _agent1Email, password: _agent1Pass);
      var stored = await storage.loadAccounts();
      expect(stored.length, 1, reason: 'first login must persist account 1');

      await manager.openWithPassword(email: _agent2Email, password: _agent2Pass);
      stored = await storage.loadAccounts();
      expect(stored.length, 2, reason: 'second login must keep account 1');
      expect(stored.map((a) => a.userId).toSet(), manager.openAccounts.map((a) => a.userId).toSet());

      // Simula F5: nuovo manager, restore da storage
      await manager.dispose();
      final fresh = AccountManager(storage: storage);
      await fresh.initialize();

      expect(fresh.openAccounts.length, 2, reason: 'after refresh both accounts restore');
      await fresh.dispose();
    });

    test('first account keeps refresh when RAM token cleared before second login', () async {
      await manager.openWithPassword(email: _agent1Email, password: _agent1Pass);
      final session1 = manager.sessions.firstWhere((s) => s.profile.username == 'alfredagent1');
      session1.clearPersistedRefreshForTest();

      await manager.openWithPassword(email: _agent2Email, password: _agent2Pass);
      await manager.persistAllOpenAccountsForTesting();

      final stored = await storage.loadAccounts();
      expect(stored.length, 2);
      final agent1 = stored.firstWhere((a) => a.username == 'alfredagent1');
      expect(agent1.refreshToken, isNotEmpty);
    });
  });
}
