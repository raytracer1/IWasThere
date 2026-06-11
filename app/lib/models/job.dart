import 'event.dart';

class Job {
  final String id;
  final String userId;
  final String? eventId;
  final String? falRequestId;
  final String inputImage;
  final String? outputVideo;
  final String status; // queued|processing|completed|failed
  final String? errorMessage;
  final int createdAt;
  final int? completedAt;

  // Enriched fields from /job/:id response
  final String? outputVideoUrl;
  final String? inputImageUrl;
  final Event? event;

  Job({
    required this.id,
    required this.userId,
    this.eventId,
    this.falRequestId,
    required this.inputImage,
    this.outputVideo,
    required this.status,
    this.errorMessage,
    required this.createdAt,
    this.completedAt,
    this.outputVideoUrl,
    this.inputImageUrl,
    this.event,
  });

  bool get isCompleted => status == 'completed';
  bool get isFailed => status == 'failed';
  bool get isProcessing => status == 'processing';
  bool get isQueued => status == 'queued';
  bool get isTerminal => isCompleted || isFailed;

  factory Job.fromJson(Map<String, dynamic> json) {
    return Job(
      id: json['id'] as String,
      userId: json['userId'] as String,
      eventId: json['eventId'] as String?,
      falRequestId: json['falRequestId'] as String?,
      inputImage: (json['inputImage'] as String?) ?? '',
      outputVideo: json['outputVideo'] as String?,
      status: (json['status'] as String?) ?? 'queued',
      errorMessage: json['errorMessage'] as String?,
      createdAt: (json['createdAt'] as num?)?.toInt() ?? 0,
      completedAt: (json['completedAt'] as num?)?.toInt(),
      outputVideoUrl: json['outputVideoUrl'] as String?,
      inputImageUrl: json['inputImageUrl'] as String?,
      event: json['event'] != null
          ? Event.fromJson(json['event'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// Extended job with event summary fields (used in history).
class JobWithEvent extends Job {
  final String? eventTitle;
  final String? eventCategory;
  final String? eventThumbnail;

  JobWithEvent({
    required super.id,
    required super.userId,
    super.eventId,
    super.falRequestId,
    required super.inputImage,
    super.outputVideo,
    required super.status,
    super.errorMessage,
    required super.createdAt,
    super.completedAt,
    super.outputVideoUrl,
    super.inputImageUrl,
    super.event,
    this.eventTitle,
    this.eventCategory,
    this.eventThumbnail,
  });

  factory JobWithEvent.fromJson(Map<String, dynamic> json) {
    return JobWithEvent(
      id: json['id'] as String,
      userId: json['userId'] as String,
      eventId: json['eventId'] as String?,
      falRequestId: json['falRequestId'] as String?,
      inputImage: (json['inputImage'] as String?) ?? '',
      outputVideo: json['outputVideo'] as String?,
      status: (json['status'] as String?) ?? 'queued',
      errorMessage: json['errorMessage'] as String?,
      createdAt: (json['createdAt'] as num?)?.toInt() ?? 0,
      completedAt: (json['completedAt'] as num?)?.toInt(),
      outputVideoUrl: json['outputVideoUrl'] as String?,
      inputImageUrl: json['inputImageUrl'] as String?,
      eventTitle: json['eventTitle'] as String?,
      eventCategory: json['eventCategory'] as String?,
      eventThumbnail: json['eventThumbnail'] as String?,
    );
  }
}

/// Upload response from POST /upload.
class UploadResponse {
  final String key;
  final String? signedUrl;
  final String filename;
  final int size;

  UploadResponse({
    required this.key,
    this.signedUrl,
    required this.filename,
    required this.size,
  });

  factory UploadResponse.fromJson(Map<String, dynamic> json) {
    return UploadResponse(
      key: json['key'] as String,
      signedUrl: json['signedUrl'] as String?,
      filename: (json['filename'] as String?) ?? '',
      size: (json['size'] as num?)?.toInt() ?? 0,
    );
  }
}
