import 'package:flutter_test/flutter_test.dart';
import 'package:wormgpt_flutter/main.dart';

void main() {
  testWidgets('App renders smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const WormGPTApp());
    await tester.pumpAndSettle();
    expect(find.text('Chats'), findsOneWidget);
    expect(find.text('Settings'), findsAtLeast(1));
  });
}
