import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'config/theme.dart';
import 'models/event.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/create_screen.dart';
import 'screens/result_screen.dart';
import 'screens/history_screen.dart';
import 'screens/admin/admin_screen.dart';
import 'screens/admin/event_form_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: HotInsertApp()));
}

class HotInsertApp extends StatelessWidget {
  const HotInsertApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HotInsert AI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.dark,
      initialRoute: '/home',
      onGenerateRoute: _onGenerateRoute,
    );
  }

  Route<dynamic>? _onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case '/login':
        return MaterialPageRoute(builder: (_) => const LoginScreen());

      case '/home':
        return MaterialPageRoute(builder: (_) => const HomeScreen());

      case '/create':
        final event = settings.arguments as Event;
        return MaterialPageRoute(
          builder: (_) => CreateScreen(event: event),
        );

      case '/result':
        final jobId = settings.arguments as String;
        return MaterialPageRoute(
          builder: (_) => ResultScreen(jobId: jobId),
        );

      case '/history':
        return MaterialPageRoute(builder: (_) => const HistoryScreen());

      case '/admin':
        return MaterialPageRoute(builder: (_) => const AdminScreen());

      case '/admin/event/new':
        return MaterialPageRoute(builder: (_) => const EventFormScreen());

      case '/admin/event/edit':
        final event = settings.arguments as Event;
        return MaterialPageRoute(
          builder: (_) => EventFormScreen(event: event),
        );

      default:
        return MaterialPageRoute(
          builder: (ctx) => Scaffold(
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Page not found', style: TextStyle(fontSize: 18)),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () =>
                        Navigator.of(ctx).pushReplacementNamed('/home'),
                    child: const Text('Go Home'),
                  ),
                ],
              ),
            ),
          ),
        );
    }
  }
}
