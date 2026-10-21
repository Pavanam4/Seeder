import 'package:youtube_explode_dart/youtube_explode_dart.dart';
import 'package:http/http.dart' as http;

void main() async {
  final yt = YoutubeExplode();
  try {
    const videoId = 'kJQP7kiw5Fk';
    print('Testing getManifest for $videoId...');
    final manifest = await yt.videos.streamsClient.getManifest(videoId);
    print('Total audio streams: ${manifest.audioOnly.length}');
    for (final s in manifest.audioOnly) {
      print('Stream: ${s.container.name} | ${s.bitrate} | itag: ${s.tag}');
    }
    final bestAac = manifest.audioOnly.firstWhere(
      (s) => s.container.name.toLowerCase().contains('mp4'),
      orElse: () => manifest.audioOnly.withHighestBitrate(),
    );
    print('Selected: ${bestAac.container.name} (${bestAac.bitrate}) -> ${bestAac.url}');
    final res = await http.get(bestAac.url, headers: {
      'Range': 'bytes=0-4096',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    });
    print('Status: ${res.statusCode}, Content-Length: ${res.contentLength}, Content-Type: ${res.headers['content-type']}');
  } catch (e, st) {
    print('Error: $e\n$st');
  } finally {
    yt.close();
  }
}
