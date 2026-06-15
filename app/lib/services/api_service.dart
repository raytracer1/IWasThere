import 'dart:io';
import 'package:dio/dio.dart';
import '../config/api_config.dart';
import '../models/api_response.dart';
import '../models/event.dart';
import '../models/job.dart';
import '../models/user.dart';
import 'api_client.dart';

class ApiService {
  final ApiClient _client;

  ApiService({required ApiClient client}) : _client = client;

  Dio get _dio => _client.dio;

  // ─── Public Endpoints ──────────────────────────────────

  Future<PaginatedResponse<Event>> getEvents({
    String? category,
    int page = 1,
    int pageSize = ApiConfig.defaultPageSize,
  }) async {
    final params = <String, dynamic>{'page': page, 'pageSize': pageSize};
    if (category != null && category.isNotEmpty) params['category'] = category;
    final response = await _dio.get('/events', queryParameters: params);
    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => Event.fromJson(json),
    );
  }

  Future<ApiResponse<Event>> getEvent(String eventId) async {
    final response = await _dio.get('/events/$eventId');
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (data) => Event.fromJson(data as Map<String, dynamic>),
    );
  }

  // ─── Generate ─────────────────────────────────────────

  Future<ApiResponse<Map<String, dynamic>>> generate(
    File file,
    String eventId,
  ) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path, filename: 'selfie.jpg'),
      'eventId': eventId,
    });
    final response = await _dio.post('/generate', data: formData,
      options: Options(contentType: 'multipart/form-data'));
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (data) => data as Map<String, dynamic>,
    );
  }

  Future<ApiResponse<Job>> getGeneration(String generationId) async {
    final response = await _dio.get('/generation/$generationId');
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (data) => Job.fromJson(data as Map<String, dynamic>),
    );
  }

  // ─── Admin Endpoints ──────────────────────────────────

  Future<PaginatedResponse<Event>> getAdminEvents({
    int page = 1, int pageSize = ApiConfig.defaultPageSize,
  }) async {
    final response = await _dio.get('/admin/events', queryParameters: {
      'page': page, 'pageSize': pageSize,
    });
    return PaginatedResponse.fromJson(
      response.data as Map<String, dynamic>,
      (json) => Event.fromJson(json),
    );
  }

  Future<ApiResponse<Map<String, dynamic>>> createEvent(Map<String, dynamic> body) async {
    final response = await _dio.post('/admin/events', data: body);
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (data) => data as Map<String, dynamic>,
    );
  }

  Future<ApiResponse<Map<String, dynamic>>> updateEvent(
    String eventId, Map<String, dynamic> body) async {
    final response = await _dio.put('/admin/events/$eventId', data: body);
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (d) => d as Map<String, dynamic>,
    );
  }

  Future<ApiResponse<Map<String, dynamic>>> deleteEvent(String eventId) async {
    final response = await _dio.delete('/admin/events/$eventId');
    return ApiResponse.fromJson(
      response.data as Map<String, dynamic>,
      (d) => d as Map<String, dynamic>,
    );
  }
}
