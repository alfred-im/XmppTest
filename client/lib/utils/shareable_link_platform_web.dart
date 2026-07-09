// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:async';
import 'dart:html' as html;

String? readShareableFragment() {
  final hash = html.window.location.hash;
  if (hash.isEmpty) return null;
  return hash.startsWith('#') ? hash.substring(1) : hash;
}

void clearShareableFragment() {
  final base = '${html.window.location.pathname}${html.window.location.search}';
  html.window.history.replaceState(null, '', base);
}

Stream<String?> watchShareableFragment() {
  return html.window.onHashChange.map((_) => readShareableFragment());
}
