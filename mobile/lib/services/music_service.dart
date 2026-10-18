import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:youtube_explode_dart/youtube_explode_dart.dart' as yt;
import '../models/track.dart';

class MusicService {
  static final MusicService _instance = MusicService._internal();
  factory MusicService() => _instance;
  MusicService._internal();

  final yt.YoutubeExplode _ytExplode = yt.YoutubeExplode();

  static const List<String> _invidiousHosts = [
    'https://inv.nadeko.net',
    'https://invidious.jing.rocks',
    'https://invidious.nerdvpn.de',
    'https://iv.ggtyler.dev',
  ];

  static const List<String> _pipedHosts = [
    'https://api.piped.private.coffee',
    'https://pipedapi.tokhmi.xyz',
  ];

  /// High-performance multi-engine search:
  /// 1. Direct YouTube Innertube API
  /// 2. Invidious Public Cluster Fallback
  /// 3. iTunes Catalog Fallback
  Future<List<MusicTrack>> search(String query, {int limit = 20}) async {
    final sanitized = query.trim();
    if (sanitized.isEmpty) return [];

    // 1. YouTube Innertube API
    try {
      final tracks = await _searchInnertube(sanitized, limit: limit);
      if (tracks.isNotEmpty) return tracks;
    } catch (_) {}

    // 2. Invidious Cluster Fallback
    try {
      final tracks = await _searchInvidious(sanitized, limit: limit);
      if (tracks.isNotEmpty) return tracks;
    } catch (_) {}

    // 3. iTunes Fallback
    try {
      final tracks = await _searchItunes(sanitized, limit: limit);
      if (tracks.isNotEmpty) return tracks;
    } catch (_) {}

    return [];
  }

  Future<List<MusicTrack>> _searchInnertube(String query, {int limit = 20}) async {
    final response = await http.post(
      Uri.parse('https://www.youtube.com/youtubei/v1/search?prettyPrint=false'),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'X-YouTube-Client-Name': '1',
        'X-YouTube-Client-Version': '2.20240101.01.00',
      },
      body: jsonEncode({
        'context': {
          'client': {
            'clientName': 'WEB',
            'clientVersion': '2.20240101.01.00',
            'hl': 'en',
            'gl': 'US',
          },
        },
        'query': query,
      }),
    ).timeout(const Duration(seconds: 5));

    if (response.statusCode != 200) return [];
    final data = jsonDecode(response.body);
    final sections = data['contents']?['twoColumnSearchResultsRenderer']?['primaryContents']?['sectionListRenderer']?['contents'] as List? ?? [];
    final tracks = <MusicTrack>[];

    for (final section in sections) {
      final contents = section['itemSectionRenderer']?['contents'] as List? ?? [];
      for (final item in contents) {
        final v = item['videoRenderer'];
        if (v == null || v['videoId'] == null) continue;
        final videoId = v['videoId'] as String;
        if (videoId.length != 11) continue;

        final title = v['title']?['runs']?[0]?['text'] ?? v['title']?['simpleText'] ?? 'Track';
        final artist = v['ownerText']?['runs']?[0]?['text'] ?? v['shortBylineText']?[0]?['text'] ?? 'Artist';
        final durationStr = v['lengthText']?['simpleText'] ?? '3:30';

        final parts = durationStr.split(':').map((p) => int.tryParse(p) ?? 0).toList();
        int durationSecs = 180;
        if (parts.length == 2) {
          durationSecs = parts[0] * 60 + parts[1];
        } else if (parts.length == 3) {
          durationSecs = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }

        final thumbs = v['thumbnail']?['thumbnails'] as List? ?? [];
        String thumbnailUrl = 'https://i.ytimg.com/vi/$videoId/hqdefault.jpg';
        if (thumbs.isNotEmpty) {
          final thumbUrl = thumbs.last['url'] as String?;
          if (thumbUrl != null && thumbUrl.isNotEmpty) {
            thumbnailUrl = thumbUrl.startsWith('//') ? 'https:$thumbUrl' : thumbUrl;
          }
        }

        tracks.add(MusicTrack(
          id: videoId,
          title: title,
          artist: artist,
          album: 'Single',
          duration: durationStr,
          durationSeconds: durationSecs,
          thumbnailUrl: thumbnailUrl,
          youtubeUrl: 'https://www.youtube.com/watch?v=$videoId',
          isEmbeddableCandidate: true,
          source: 'innertube',
        ));

        if (tracks.length >= limit) break;
      }
      if (tracks.length >= limit) break;
    }

    return tracks;
  }

  Future<List<MusicTrack>> _searchInvidious(String query, {int limit = 20}) async {
    for (final host in _invidiousHosts) {
      try {
        final res = await http.get(
          Uri.parse('$host/api/v1/search?q=${Uri.encodeComponent(query)}&type=video'),
        ).timeout(const Duration(seconds: 4));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body) as List? ?? [];
          final tracks = <MusicTrack>[];
          for (final item in data) {
            final videoId = item['videoId'] as String?;
            if (videoId == null || videoId.length != 11) continue;

            final secs = item['lengthSeconds'] as int? ?? 180;
            final mins = secs ~/ 60;
            final rem = secs % 60;
            final durationStr = '$mins:${rem < 10 ? '0' : ''}$rem';

            final thumbs = item['videoThumbnails'] as List? ?? [];
            final thumbUrl = thumbs.isNotEmpty ? thumbs[0]['url'] as String? : null;

            tracks.add(MusicTrack(
              id: videoId,
              title: item['title'] ?? 'Track',
              artist: item['author'] ?? 'Artist',
              album: 'Official Audio',
              duration: durationStr,
              durationSeconds: secs,
              thumbnailUrl: thumbUrl ?? 'https://i.ytimg.com/vi/$videoId/hqdefault.jpg',
              youtubeUrl: 'https://www.youtube.com/watch?v=$videoId',
              isEmbeddableCandidate: true,
              source: 'invidious',
            ));

            if (tracks.length >= limit) break;
          }
          if (tracks.isNotEmpty) return tracks;
        }
      } catch (_) {}
    }
    return [];
  }

  Future<List<MusicTrack>> _searchItunes(String query, {int limit = 20}) async {
    final res = await http.get(
      Uri.parse('https://itunes.apple.com/search?term=${Uri.encodeComponent(query)}&entity=song&limit=$limit'),
    ).timeout(const Duration(seconds: 4));

    if (res.statusCode != 200) return [];
    final data = jsonDecode(res.body);
    final results = data['results'] as List? ?? [];
    final tracks = <MusicTrack>[];

    for (final r in results) {
      final totalSecs = ((r['trackTimeMillis'] as int? ?? 180000) / 1000).round();
      final mins = totalSecs ~/ 60;
      final rem = totalSecs % 60;
      final art = (r['artworkUrl100'] as String? ?? '').replaceAll('100x100bb', '600x600bb');

      tracks.add(MusicTrack(
        id: r['trackId'].toString(),
        title: r['trackName'] ?? 'Song',
        artist: r['artistName'] ?? 'Artist',
        album: r['collectionName'] ?? 'Single',
        duration: '$mins:${rem < 10 ? '0' : ''}$rem',
        durationSeconds: totalSecs,
        thumbnailUrl: art.isNotEmpty ? art : 'https://i.ytimg.com/vi/${r['trackId']}/hqdefault.jpg',
        youtubeUrl: '',
        isEmbeddableCandidate: false,
        source: 'itunes',
      ));
    }
    return tracks;
  }

  /// Get curated regional trending hits by language
  Future<List<MusicTrack>> getRegionalFeed(String languageKey) async {
    final queries = {
      'all': 'Trending Global Music Hits 2024',
      'malayalam': 'Latest Malayalam Hits Songs 2024',
      'hindi': 'Trending Hindi Songs Top Hits',
      'tamil': 'Latest Tamil Hits Songs 2024',
      'english': 'Billboard Top Pop Hits',
      'punjabi': 'Latest Punjabi Hot Hits',
    };

    final query = queries[languageKey] ?? 'Trending Global Hits';
    return search(query, limit: 15);
  }

  /// Get algorithm-based "Made For You" and "Top Recommendations"
  Future<List<MusicTrack>> getMadeForYouFeed() async {
    return search('Superhit Songs Trending Jukebox', limit: 12);
  }

  /// Extract direct playable audio stream URL for ExoPlayer
  Future<Uri?> getAudioStreamUri(String videoId) async {
    // If the ID is an iTunes ID (not 11 chars), resolve to YouTube video ID first
    String targetId = videoId;
    if (videoId.length != 11) {
      final searchResult = await search(videoId, limit: 1);
      if (searchResult.isNotEmpty && searchResult[0].id.length == 11) {
        targetId = searchResult[0].id;
      } else {
        return null;
      }
    }

    // 1. Try Invidious Video Format Extraction
    for (final host in _invidiousHosts) {
      try {
        final res = await http.get(
          Uri.parse('$host/api/v1/videos/$targetId'),
        ).timeout(const Duration(seconds: 4));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final adaptive = data['adaptiveFormats'] as List? ?? [];
          final audioList = adaptive.where((f) => (f['type'] as String? ?? '').startsWith('audio/')).toList();
          if (audioList.isNotEmpty) {
            // Sort by bitrate descending
            audioList.sort((a, b) => (b['bitrate'] as int? ?? 0).compareTo(a['bitrate'] as int? ?? 0));
            final url = audioList[0]['url'] as String?;
            if (url != null && url.isNotEmpty) {
              return Uri.parse(url);
            }
          }
        }
      } catch (_) {}
    }

    // 2. Try Piped API
    for (final host in _pipedHosts) {
      try {
        final res = await http.get(
          Uri.parse('$host/streams/$targetId'),
        ).timeout(const Duration(seconds: 4));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final streams = data['audioStreams'] as List? ?? [];
          if (streams.isNotEmpty) {
            final url = streams[0]['url'] as String?;
            if (url != null && url.isNotEmpty) {
              return Uri.parse(url);
            }
          }
        }
      } catch (_) {}
    }

    // 3. Fallback: YouTube Explode Dart
    try {
      final manifest = await _ytExplode.videos.streamsClient.getManifest(targetId);
      final audioOnly = manifest.audioOnly;
      if (audioOnly.isNotEmpty) {
        return audioOnly.withHighestBitrate().url;
      }
    } catch (_) {}

    return null;
  }

  void dispose() {
    _ytExplode.close();
  }
}
