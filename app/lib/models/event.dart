class Event {
  final String id;
  final String title;
  final String category;
  final String? eventType;
  final Map<String, dynamic> scene;
  final Map<String, dynamic> emotion;
  final Map<String, dynamic> camera;
  final Map<String, dynamic> user;
  final Map<String, dynamic> entities;
  final Map<String, dynamic> moment;
  final Map<String, dynamic> generation;
  final String? thumbnailUrl;
  final String? referenceVideo;
  final String status;
  final int? createdAt;

  Event({
    required this.id,
    required this.title,
    required this.category,
    this.eventType,
    this.scene = const {},
    this.emotion = const {},
    this.camera = const {},
    this.user = const {},
    this.entities = const {},
    this.moment = const {},
    this.generation = const {},
    this.thumbnailUrl,
    this.referenceVideo,
    required this.status,
    this.createdAt,
  });

  String get timePeriod => (scene['time_period'] ?? '') as String;
  String get location => (scene['location'] ?? '') as String;
  String get promptTemplate => (generation['prompt_template'] ?? '') as String;
  String get backgroundImage => (generation['background_image'] ?? '') as String;

  factory Event.fromJson(Map<String, dynamic> json) {
    return Event(
      id: json['id'] as String,
      title: json['title'] as String,
      category: (json['category'] as String?) ?? 'sports',
      eventType: json['event_type'] as String?,
      scene: (json['scene'] as Map<String, dynamic>?) ?? {},
      emotion: (json['emotion'] as Map<String, dynamic>?) ?? {},
      camera: (json['camera'] as Map<String, dynamic>?) ?? {},
      user: (json['user'] as Map<String, dynamic>?) ?? {},
      entities: (json['entities'] as Map<String, dynamic>?) ?? {},
      moment: (json['moment'] as Map<String, dynamic>?) ?? {},
      generation: (json['generation'] as Map<String, dynamic>?) ?? {},
      thumbnailUrl: json['thumbnailUrl'] as String?,
      referenceVideo: json['referenceVideo'] as String?,
      status: (json['status'] as String?) ?? 'active',
      createdAt: (json['createdAt'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'category': category,
      'event_type': eventType,
      'scene': scene,
      'emotion': emotion,
      'camera': camera,
      'user': user,
      'entities': entities,
      'moment': moment,
      'generation': generation,
      'thumbnailUrl': thumbnailUrl,
      'referenceVideo': referenceVideo,
      'status': status,
      'createdAt': createdAt,
    };
  }
}
