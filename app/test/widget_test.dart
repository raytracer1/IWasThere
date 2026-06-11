import 'package:flutter_test/flutter_test.dart';
import 'package:iwasthere_app/main.dart';

void main() {
  testWidgets('App renders login screen', (WidgetTester tester) async {
    await tester.pumpWidget(const HotInsertApp());
    await tester.pumpAndSettle();

    // Verify the login screen is shown
    expect(find.text('HotInsert AI'), findsOneWidget);
  });
}
