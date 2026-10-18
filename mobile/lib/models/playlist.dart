import 'track.dart';

class Playlist {
  final String id;
  final String name;
  final String description;
  final String? coverUrl;
  final String createdAt;
  final bool isCustom;
  final List<MusicTrack> tracks;

  Playlist({
    required this.id,
    required this.name,
    required this.description,
    this.coverUrl,
    required this.createdAt,
    this.isCustom = true,
    required this.tracks,
  });

  factory Playlist.fromJson(Map<String, dynamic> json) {
    return Playlist(
      id: json['id'] ?? '',
      name: json['name'] ?? 'Playlist',
      description: json['description'] ?? '',
      coverUrl: json['coverUrl'],
      createdAt: json['createdAt'] ?? DateTime.now().toIso8601String(),
      isCustom: json['isCustom'] ?? true,
      tracks: (json['tracks'] as List<dynamic>? ?? [])
          .map((t) => MusicTrack.fromJson(t as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'coverUrl': coverUrl,
      'createdAt': createdAt,
      'isCustom': isCustom,
      'tracks': tracks.map((t) => t.toJson()).toList(),
    };
  }
}
