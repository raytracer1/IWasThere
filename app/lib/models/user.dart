class User {
  final String id;
  final String email;
  final String? name;
  final String? image;
  final String role; // 'user' | 'admin'
  final int credits;
  final int createdAt;

  User({
    required this.id,
    required this.email,
    this.name,
    this.image,
    required this.role,
    required this.credits,
    required this.createdAt,
  });

  bool get isAdmin => role == 'admin';

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      image: json['image'] as String?,
      role: (json['role'] as String?) ?? 'user',
      credits: (json['credits'] as num?)?.toInt() ?? 0,
      createdAt: (json['createdAt'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'image': image,
      'role': role,
      'credits': credits,
      'createdAt': createdAt,
    };
  }
}
