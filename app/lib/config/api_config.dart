/// API configuration for the HotInsert AI backend.
class ApiConfig {
  /// Base URL of the Cloudflare Worker API.
  /// Change this to your production URL for release builds.
  static const String workerUrl =
      String.fromEnvironment('WORKER_URL',
          defaultValue: 'https://hotinsert-api.zhengbijun123.workers.dev');

  /// Polling interval for job status checks.
  static const int pollIntervalMs = 3000;

  /// Maximum selfie upload size (10 MB).
  static const int maxSelfieSize = 10 * 1024 * 1024;

  /// Maximum video upload size (100 MB).
  static const int maxVideoSize = 100 * 1024 * 1024;

  /// Maximum thumbnail upload size (5 MB).
  static const int maxThumbnailSize = 5 * 1024 * 1024;

  /// Default page size for paginated requests.
  static const int defaultPageSize = 20;

  /// Signed URL expiry in seconds (15 minutes).
  static const int signedUrlExpiry = 900;

  /// Default cost per generation in USD.
  static const double costPerGeneration = 0.50;

  /// Default resolution for AI generation.
  static const String defaultResolution = '720p';

  /// Accepted image MIME types for selfie upload.
  static const List<String> acceptedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  /// Event categories.
  static const List<String> categories = [
    'sports',
    'music',
    'movies',
    'news',
    'other',
  ];
}
