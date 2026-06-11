import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

/// Provider for the API client (singleton).
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

/// Provider for the API service.
final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService(client: ref.watch(apiClientProvider));
});

/// Provider for the auth service.
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(apiClient: ref.watch(apiClientProvider));
});

/// Auth state.
enum AuthState { initial, loading, authenticated, unauthenticated, error }

/// Authentication state notifier.
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;
  final ApiService _apiService;

  User? _user;
  String? _errorMessage;

  AuthNotifier(this._authService, this._apiService)
      : super(AuthState.initial);

  User? get user => _user;
  String? get errorMessage => _errorMessage;

  /// Try to restore session from stored token on app start.
  Future<void> tryRestoreSession() async {
    state = AuthState.loading;
    try {
      final user = await _authService.tryRestoreSession();
      if (user != null) {
        _user = user;
        state = AuthState.authenticated;
      } else {
        state = AuthState.unauthenticated;
      }
    } catch (e) {
      _errorMessage = e.toString();
      state = AuthState.unauthenticated;
    }
  }

  /// Sign in with Google.
  Future<void> signIn() async {
    state = AuthState.loading;
    try {
      _user = await _authService.signInWithGoogle();
      state = AuthState.authenticated;
    } catch (e) {
      _errorMessage = e.toString();
      state = AuthState.error;
    }
  }

  /// Sign out.
  Future<void> signOut() async {
    await _authService.signOut();
    _user = null;
    state = AuthState.unauthenticated;
  }

  /// Refresh user credits from /me endpoint.
  Future<void> refreshCredits() async {
    if (_user == null) return;
    try {
      final response = await _apiService.getMe();
      if (response.success && response.data != null) {
        _user = response.data;
        state = AuthState.authenticated;
      }
    } catch (_) {}
  }
}

/// The main auth state provider.
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.watch(authServiceProvider),
    ref.watch(apiServiceProvider),
  );
});

/// Derived provider for the current user (null if not logged in).
final currentUserProvider = Provider<User?>((ref) {
  final notifier = ref.read(authProvider.notifier);
  return notifier.user;
});

/// Derived provider: is the user logged in?
final isLoggedInProvider = Provider<bool>((ref) {
  return ref.watch(authProvider) == AuthState.authenticated;
});

/// Derived provider: is the user an admin?
final isAdminProvider = Provider<bool>((ref) {
  final user = ref.watch(currentUserProvider);
  return user?.isAdmin ?? false;
});

/// Derived provider: user credits.
final userCreditsProvider = Provider<double>((ref) {
  final user = ref.watch(currentUserProvider);
  return user?.credits.toDouble() ?? 0.0;
});
