// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:flutter/foundation.dart';

import '../models/contact.dart';
import '../models/profile_summary.dart';
import '../services/contact_service.dart';
import '../utils/list_filter.dart';

class ContactsController extends ChangeNotifier {
  ContactsController({
    required this.ownerId,
    required this.contactService,
  }) {
    load();
  }

  final String ownerId;
  final ContactService contactService;

  List<Contact> contacts = [];
  bool isLoading = true;
  String? error;
  String _searchQuery = '';

  List<Contact> get filteredContacts => filterByQuery(
        contacts,
        _searchQuery,
        (contact) => contact.displayName,
      );

  Contact? contactForProfileId(String profileId) {
    for (final contact in contacts) {
      if (contact.protocol == ContactProtocol.internal &&
          contact.linkedProfileId == profileId) {
        return contact;
      }
    }
    return null;
  }

  void setSearchQuery(String value) {
    _searchQuery = value;
    notifyListeners();
  }

  Future<void> load() async {
    try {
      contacts = await contactService.fetchContacts(ownerId);
      error = null;
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<List<ProfileSummary>> searchProfiles(String query) {
    return contactService.searchProfiles(query);
  }

  Future<Contact> addInternal(ProfileSummary profile) async {
    final contact = await contactService.addInternalContact(
      ownerId: ownerId,
      profile: profile,
    );
    await load();
    return contact;
  }

  Future<void> removeInternalByProfileId(String profileId) async {
    final contact = contactForProfileId(profileId);
    if (contact == null) return;
    await contactService.deleteContact(contact.id);
    await load();
  }

  Future<Contact> addExternal({
    required ContactProtocol protocol,
    required String address,
    required String displayName,
  }) async {
    final contact = await contactService.addExternalContact(
      ownerId: ownerId,
      protocol: protocol,
      externalAddress: address,
      displayName: displayName,
    );
    await load();
    return contact;
  }
}
