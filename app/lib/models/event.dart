class Event {
  final String id;
  final String title;
  final String category; // sports|music|movies|news|other
  final String? description;
  final String videoUrl;
  final String? thumbnailUrl;
  final int? duration;
  final double? price;
  final String? trimRanges; // JSON string
  final String? originalVideoUrl;
  final String status; // active|draft|archived
  final String? createdBy;
  final int? createdAt;

  Event({
    required this.id,
    required this.title,
    required this.category,
    this.description,
    required this.videoUrl,
    this.thumbnailUrl,
    this.duration,
    this.price,
    this.trimRanges,
    this.originalVideoUrl,
    required this.status,
    this.createdBy,
    this.createdAt,
  });

  double get effectivePrice => price ?? 0.50;

  factory Event.fromJson(Map<String, dynamic> json) {
    return Event(
      id: json['id'] as String,
      title: json['title'] as String,
      category: (json['category'] as String?) ?? 'other',
      description: json['description'] as String?,
      videoUrl: (json['videoUrl'] as String?) ?? '',
      thumbnailUrl: json['thumbnailUrl'] as String?,
      duration: (json['duration'] as num?)?.toInt(),
      price: (json['price'] as num?)?.toDouble(),
      trimRanges: json['trimRanges'] as String?,
      originalVideoUrl: json['originalVideoUrl'] as String?,
      status: (json['status'] as String?) ?? 'active',
      createdBy: json['createdBy'] as String?,
      createdAt: (json['createdAt'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'category': category,
      'description': description,
      'videoUrl': videoUrl,
      'thumbnailUrl': thumbnailUrl,
      'duration': duration,
      'price': price,
      'trimRanges': trimRanges,
      'originalVideoUrl': originalVideoUrl,
      'status': status,
      'createdBy': createdBy,
      'createdAt': createdAt,
    };
  }
}
