// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

export 'shareable_link_platform_stub.dart'
    if (dart.library.html) 'shareable_link_platform_web.dart';
