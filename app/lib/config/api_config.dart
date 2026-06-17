/// API configuration for the HotInsert AI backend.
class ApiConfig {
  /// Base URL of the Cloudflare Worker API.
  /// Change this to your production URL for release builds.
  static const String workerUrl =
      String.fromEnvironment('WORKER_URL',
          defaultValue: 'https://ifiwasthere-api.zhengbijun123.workers.dev');

  static const int pollIntervalMs = 3000;
  static const int maxSelfieSize = 10 * 1024 * 1024;
  static const int defaultPageSize = 20;

  static const List<String> categories = [
    'sports', 'fiction', 'history',
  ];
}
