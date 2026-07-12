// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

String formatVoiceDuration(int totalSeconds) {
  final seconds = totalSeconds.clamp(0, 5999);
  final minutes = seconds ~/ 60;
  final remainder = seconds % 60;
  return '$minutes:${remainder.toString().padLeft(2, '0')}';
}

String formatVoiceDurationMs(int milliseconds) {
  return formatVoiceDuration((milliseconds / 1000).floor());
}
