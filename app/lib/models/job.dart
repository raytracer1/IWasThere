import 'event.dart';

class Job {
  final String id;
  final String userId;
  final String? eventId;
  final String? agnesJobId;
  final String inputImage;
  final String? outputImage;
  final String status;
  final String? errorMessage;
  final List<String>? captions;
  final String? selectedCaption;
  final int createdAt;
  final int? completedAt;

  // Enriched fields
  final String? outputImageUrl;
  final String? eventTitle;
  final String? eventCategory;
  final String? eventThumbnail;

  Job({
    required this.id,
    required this.userId,
    this.eventId,
    this.agnesJobId,
    required this.inputImage,
    this.outputImage,
    required this.status,
    this.errorMessage,
    this.captions,
    this.selectedCaption,
    required this.createdAt,
    this.completedAt,
    this.outputImageUrl,
    this.eventTitle,
    this.eventCategory,
    this.eventThumbnail,
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
      agnesJobId: json['agnesJobId'] as String?,
      inputImage: (json['inputImage'] as String?) ?? '',
      outputImage: json['outputImage'] as String?,
      status: (json['status'] as String?) ?? 'queued',
      errorMessage: json['errorMessage'] as String?,
      captions: (json['captions'] as List?)?.cast<String>(),
      selectedCaption: json['selectedCaption'] as String?,
      createdAt: (json['createdAt'] as num?)?.toInt() ?? 0,
      completedAt: (json['completedAt'] as num?)?.toInt(),
      outputImageUrl: json['outputImageUrl'] as String?,
      eventTitle: json['eventTitle'] as String?,
      eventCategory: json['eventCategory'] as String?,
      eventThumbnail: json['eventThumbnail'] as String?,
    );
  }
}
