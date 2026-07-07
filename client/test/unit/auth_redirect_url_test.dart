import 'package:flutter_test/flutter_test.dart';

import 'package:alfred_client/utils/auth_redirect_url.dart';

void main() {
  test('resolve returns Alpha default off-web', () {
    expect(AuthRedirectUrl.resolve(), AuthRedirectUrl.alphaDefault);
  });
}
