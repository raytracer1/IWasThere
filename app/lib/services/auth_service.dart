import 'package:google_sign_in/google_sign_in.dart';
import '../models/user.dart';
import 'api_client.dart';
import 'package:dio/dio.dart';

/// Service handling Google Sign-In and JWT token exchange with the backend.
class AuthService {
  final GoogleSignIn _googleSignIn;
  final ApiClient _apiClient;

  AuthService({required ApiClient apiClient})
      : _apiClient = apiClient,
        _googleSignIn = GoogleSignIn(
          scopes: ['email', 'profile'],
          clientId: '146942736034-lec7vsa6tl9h9epcc9ubk8hkr90pdu3i.apps.googleusercontent.com',
        );

  /// Check if user is currently signed in with Google.
  bool get isGoogleSignedIn => _googleSignIn.currentUser != null;

  /// Initiate Google Sign-In flow and exchange idToken for session JWT.
  /// Returns the authenticated [User] on success.
  Future<User> signInWithGoogle() async {
    // Sign in with Google
    final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
    if (googleUser == null) {
      throw ApiException('Google sign-in cancelled');
    }

    // Get the idToken
    final GoogleSignInAuthentication googleAuth =
        await googleUser.authentication;
    final String? idToken = googleAuth.idToken;
    if (idToken == null) {
      throw ApiException('Failed to get Google idToken');
    }

    // Exchange idToken for session JWT via backend
    // If the /auth/google endpoint fails, we try to use the idToken directly
    // with the /me endpoint (some configurations accept Google tokens directly)
    try {
      final response = await _apiClient.dio.post(
        '/auth/google',
        data: {'idToken': idToken},
      );
      final body = response.data as Map<String, dynamic>;
      if (body['success'] == true && body['data'] != null) {
        final data = body['data'] as Map<String, dynamic>;
        final token = data['token'] as String;
        await _apiClient.setToken(token);
        return User.fromJson(data['user'] as Map<String, dynamic>);
      }
    } catch (e) {
      // If the dedicated endpoint doesn't exist yet, fall back to trying
      // the idToken directly with /me (depending on backend configuration)
    }

    // Fallback: try the Google idToken directly
    await _apiClient.setToken(idToken);
    try {
      final response = await _apiClient.dio.get('/me');
      final body = response.data as Map<String, dynamic>;
      if (body['success'] == true && body['data'] != null) {
        final userData = body['data'] as Map<String, dynamic>;
        final user = User(
          id: (userData['id'] as String?) ?? googleUser.id,
          email: userData['email'] as String? ?? googleUser.email,
          name: userData['name'] as String? ?? googleUser.displayName,
          image: userData['image'] as String? ?? googleUser.photoUrl,
          role: (userData['role'] as String?) ?? 'user',
          credits: (userData['credits'] as num?)?.toInt() ?? 0,
          createdAt: (userData['createdAt'] as num?)?.toInt() ?? 0,
        );
        return user;
      }
    } catch (_) {
      await _apiClient.deleteToken();
      rethrow;
    }

    throw ApiException('Authentication failed');
  }

  /// Try to restore the session from a stored token by calling /me.
  /// Returns null if no stored token exists or the token is invalid.
  Future<User?> tryRestoreSession() async {
    final hasToken = await _apiClient.hasToken();
    if (!hasToken) return null;

    try {
      final response = await _apiClient.dio.get('/me');
      final body = response.data as Map<String, dynamic>;
      if (body['success'] == true && body['data'] != null) {
        return User.fromJson(body['data'] as Map<String, dynamic>);
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        await _apiClient.deleteToken();
        // Try Google silent sign-in to get a fresh token
        try {
          final currentUser = _googleSignIn.currentUser;
          if (currentUser != null) {
            return await signInWithGoogle();
          }
        } catch (_) {}
      }
    } catch (_) {}

    return null;
  }

  /// Sign out — clear stored token and sign out of Google.
  Future<void> signOut() async {
    await _apiClient.deleteToken();
    await _googleSignIn.signOut();
  }

  /// Get the GoogleSignIn instance (for use by providers).
  GoogleSignIn get googleSignIn => _googleSignIn;
}
