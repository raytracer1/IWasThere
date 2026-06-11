import 'dart:io';
import 'package:dio/dio.dart';
import '../config/api_config.dart';
import '../models/api_response.dart';
import '../models/event.dart';
import '../models/job.dart';
import '../models/user.dart';
import 'api_client.dart';

/// Service wrapping all HotInsert AI backend API calls.
class ApiService {
  final ApiClient _client;

  ApiService({required ApiClient client}) : _client = client;

  Dio get _dio => _client.dio;

  // ─── Public Endpoints ──────────────────────────────────

  /// List active events with optional category filter and pagination.
  Future<PaginatedResponse<Event>> getEvents({
    String? category,
    int page = 1,
    int pageSize = ApiConfig.defaultPageSize,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'pageSize': pageSize,
    };
    if (category != null && category.isNotEmpty) {
      params['category'] = category;
    }
    final response = await _dio.get('/events', queryParameters: params);
    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => Event.fromJson(json),
    );
  }

  /// Get a single event by ID.
  Future<ApiResponse<Event>> getEvent(String eventId) async {
    final response = await _dio.get('/events/$eventId');
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (data) => Event.fromJson(data as Map<String, dynamic>),
    );
  }

  // ─── Authenticated Endpoints ───────────────────────────

  /// Get the current user's profile and credits.
  Future<ApiResponse<User>> getMe() async {
    final response = await _dio.get('/me');
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (data) => User.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Upload a selfie image to R2. Returns the file key for swap.
  Future<ApiResponse<UploadResponse>> uploadSelfie(File file) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        file.path,
        filename: file.path.split('/').last,
      ),
    });
    final response = await _dio.post(
      '/upload',
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (data) => UploadResponse.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Trigger an AI face-swap job.
  Future<ApiResponse<Map<String, dynamic>>> triggerSwap({
    required String eventId,
    required String imageKey,
    String resolution = ApiConfig.defaultResolution,
  }) async {
    final response = await _dio.post('/swap', data: {
      'eventId': eventId,
      'imageKey': imageKey,
      'resolution': resolution,
    });
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (data) => data as Map<String, dynamic>,
    );
  }

  /// Poll job status and get result. The backend polls fal.ai on each call.
  Future<ApiResponse<Job>> getJob(String jobId) async {
    final response = await _dio.get('/job/$jobId');
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (data) => Job.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Get the user's generation history.
  Future<PaginatedResponse<JobWithEvent>> getHistory({
    int page = 1,
    int pageSize = ApiConfig.defaultPageSize,
  }) async {
    final response = await _dio.get('/history', queryParameters: {
      'page': page,
      'pageSize': pageSize,
    });
    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => JobWithEvent.fromJson(json),
    );
  }

  // ─── Admin Endpoints ──────────────────────────────────

  /// List all events (including drafts) — admin only.
  Future<PaginatedResponse<Event>> getAdminEvents({
    int page = 1,
    int pageSize = ApiConfig.defaultPageSize,
  }) async {
    final response = await _dio.get('/admin/events', queryParameters: {
      'page': page,
      'pageSize': pageSize,
    });
    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => Event.fromJson(json),
    );
  }

  /// Create a new event — admin only.
  Future<ApiResponse<Map<String, dynamic>>> createEvent(FormData formData) async {
    final response = await _dio.post(
      '/admin/events',
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (data) => data as Map<String, dynamic>,
    );
  }

  /// Update an event via multipart (files + fields) — admin only.
  Future<ApiResponse<Map<String, dynamic>>> updateEventMultipart(
    String eventId,
    FormData formData,
  ) async {
    final response = await _dio.post(
      '/admin/events/$eventId/update',
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (data) => data as Map<String, dynamic>,
    );
  }

  /// Update an event with JSON body (metadata only) — admin only.
  Future<ApiResponse<Map<String, dynamic>>> updateEvent(
    String eventId,
    Map<String, dynamic> data,
  ) async {
    final response = await _dio.put('/admin/events/$eventId', data: data);
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (d) => d as Map<String, dynamic>,
    );
  }

  /// Delete an event — admin only.
  Future<ApiResponse<Map<String, dynamic>>> deleteEvent(String eventId) async {
    final response = await _dio.delete('/admin/events/$eventId');
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (data) => data as Map<String, dynamic>,
    );
  }
}
