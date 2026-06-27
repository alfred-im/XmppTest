import 'package:alfred_client/utils/compose_address.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('parseComposeAddress', () {
    test('internal username', () {
      final parsed = parseComposeAddress('Mario_Rossi');
      expect(parsed.kind, ComposeAddressKind.internalUsername);
      expect(parsed.normalized, 'mario_rossi');
    });

    test('external server address', () {
      final parsed = parseComposeAddress('mario@dominio.it');
      expect(parsed.kind, ComposeAddressKind.externalServer);
      expect(parsed.normalized, 'mario@dominio.it');
    });

    test('invalid empty', () {
      final parsed = parseComposeAddress('  ');
      expect(parsed.kind, ComposeAddressKind.invalid);
    });

    test('validator rejects external for now', () {
      expect(
        validateComposeAddressInput('mario@dominio.it'),
        'Indirizzo esterno non ancora supportato',
      );
    });

    test('validator accepts internal username', () {
      expect(validateComposeAddressInput('mario_rossi'), isNull);
    });
  });
}
