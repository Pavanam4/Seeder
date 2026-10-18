import 'package:audio_service/audio_service.dart';

class MusicTrack {
  final String id;
  final String title;
  final String artist;
  final String album;
  final String duration;
  final int durationSeconds;
  final String thumbnailUrl;
  final String youtubeUrl;
  final bool isEmbeddableCandidate;
  final String source;

  MusicTrack({
    required this.id,
    required this.title,
    required this.artist,
    required this.album,
    required this.duration,
    required this.durationSeconds,
    required this.thumbnailUrl,
    required this.youtubeUrl,
    this.isEmbeddableCandidate = true,
    this.source = 'ytmusic',
  });

  factory MusicTrack.fromJson(Map<String, dynamic> json) {
    return MusicTrack(
      id: json['id'] ?? '',
      title: json['title'] ?? 'Untitled Track',
      artist: json['artist'] ?? 'Unknown Artist',
      album: json['album'] ?? 'Single',
      duration: json['duration'] ?? '3:30',
      durationSeconds: json['durationSeconds'] ?? 210,
      thumbnailUrl: json['thumbnailUrl'] ?? '',
      youtubeUrl: json['youtubeUrl'] ?? 'https://www.youtube.com/watch?v=${json['id']}',
      isEmbeddableCandidate: json['isEmbeddableCandidate'] ?? true,
      source: json['source'] ?? 'ytmusic',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'artist': artist,
      'album': album,
      'duration': duration,
      'durationSeconds': durationSeconds,
      'thumbnailUrl': thumbnailUrl,
      'youtubeUrl': youtubeUrl,
      'isEmbeddableCandidate': isEmbeddableCandidate,
      'source': source,
    };
  }

  // Convert to AudioService MediaItem for Android lock screen & notification shade
  MediaItem toMediaItem({Uri? streamUri}) {
    return MediaItem(
      id: id,
      album: album,
      title: title,
      artist: artist,
      duration: Duration(seconds: durationSeconds > 0 ? durationSeconds : 180),
      artUri: thumbnailUrl.isNotEmpty ? Uri.tryParse(thumbnailUrl) : null,
      extras: {
        'youtubeUrl': youtubeUrl,
        'streamUri': streamUri?.toString(),
      },
    );
  }
}
