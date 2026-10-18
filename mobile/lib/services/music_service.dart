import 'package:youtube_explode_dart/youtube_explode_dart.dart';
import '../models/track.dart';

class MusicService {
  static final MusicService _instance = MusicService._internal();
  factory MusicService() => _instance;
  MusicService._internal();

  final YoutubeExplode _yt = YoutubeExplode();

  // Search YouTube Music tracks with normalization
  Future<List<MusicTrack>> search(String query, {int limit = 20}) async {
    try {
      final sanitized = query.trim();
      final results = await _yt.search.search(sanitized);
      final tracks = <MusicTrack>[];

      for (final video in results) {
        final durationSeconds = video.duration?.inSeconds ?? 180;
        final mins = durationSeconds ~/ 60;
        final remSecs = durationSeconds % 60;
        final durationStr = '$mins:${remSecs < 10 ? '0' : ''}$remSecs';

        tracks.add(MusicTrack(
          id: video.id.value,
          title: video.title,
          artist: video.author,
          album: 'Official Audio',
          duration: durationStr,
          durationSeconds: durationSeconds,
          thumbnailUrl: video.thumbnails.highResUrl,
          youtubeUrl: video.url,
          isEmbeddableCandidate: true,
          source: 'yt_explode',
        ));

        if (tracks.length >= limit) break;
      }

      return tracks;
    } catch (e) {
      print('MusicService search error: $e');
      return [];
    }
  }

  // Get curated trending hits by regional language or mood
  Future<List<MusicTrack>> getRegionalFeed(String languageKey) async {
    final queries = {
      'malayalam': 'Malayalam Top Hits Songs',
      'hindi': 'Trending Hindi Songs',
      'tamil': 'Latest Tamil Hits',
      'english': 'Top Global Pop Hits',
      'punjabi': 'Punjabi Hot Hits',
      'all': 'Trending Global Music Charts',
    };

    final query = queries[languageKey] ?? 'Trending Global Music Charts';
    return search(query, limit: 12);
  }

  // Extract direct playable audio stream URL for native ExoPlayer background playback
  Future<Uri?> getAudioStreamUri(String videoId) async {
    try {
      final manifest = await _yt.videos.streamsClient.getManifest(videoId);
      final audioOnly = manifest.audioOnly;
      if (audioOnly.isNotEmpty) {
        final bestStream = audioOnly.withHighestBitrate();
        return bestStream.url;
      }
      return null;
    } catch (e) {
      print('Error extracting direct audio stream for $videoId: $e');
      return null;
    }
  }

  void dispose() {
    _yt.close();
  }
}
