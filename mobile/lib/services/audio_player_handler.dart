import 'package:audio_service/audio_service.dart';
import 'package:audio_session/audio_session.dart';
import 'package:just_audio/just_audio.dart';
import '../models/track.dart';
import 'music_service.dart';

class AudioPlayerHandler extends BaseAudioHandler with QueueHandler, SeekHandler {
  final AudioPlayer _player = AudioPlayer();
  final MusicService _musicService = MusicService();

  List<MusicTrack> _currentQueue = [];
  int _currentIndex = -1;

  AudioPlayer get player => _player;
  List<MusicTrack> get currentQueue => _currentQueue;
  int get currentIndex => _currentIndex;
  MusicTrack? get currentTrack =>
      _currentIndex >= 0 && _currentIndex < _currentQueue.length ? _currentQueue[_currentIndex] : null;

  AudioPlayerHandler() {
    _initAudioSession();
    _broadcastPlaybackState();
    _listenToPlayerEvents();
  }

  Future<void> _initAudioSession() async {
    final session = await AudioSession.instance;
    await session.configure(const AudioSessionConfiguration.music());
  }

  void _broadcastPlaybackState() {
    _player.playbackEventStream.listen((PlaybackEvent event) {
      final isPlaying = _player.playing;
      final processingState = _player.processingState;

      playbackState.add(playbackState.value.copyWith(
        controls: [
          MediaControl.skipToPrevious,
          if (isPlaying) MediaControl.pause else MediaControl.play,
          MediaControl.skipToNext,
          MediaControl.stop,
        ],
        systemActions: const {
          MediaAction.seek,
          MediaAction.seekForward,
          MediaAction.seekBackward,
        },
        androidCompactActionIndices: const [0, 1, 2],
        processingState: const {
          ProcessingState.idle: AudioProcessingState.idle,
          ProcessingState.loading: AudioProcessingState.loading,
          ProcessingState.buffering: AudioProcessingState.buffering,
          ProcessingState.ready: AudioProcessingState.ready,
          ProcessingState.completed: AudioProcessingState.completed,
        }[processingState]!,
        playing: isPlaying,
        updatePosition: _player.position,
        bufferedPosition: _player.bufferedPosition,
        speed: _player.speed,
        queueIndex: _currentIndex,
      ));
    });
  }

  void _listenToPlayerEvents() {
    // When track completes, automatically play next in queue
    _player.playerStateStream.listen((state) {
      if (state.processingState == ProcessingState.completed) {
        skipToNext();
      }
    });
  }

  // Play a specific track with optional surrounding queue
  Future<void> playTrack(MusicTrack track, [List<MusicTrack>? newQueue]) async {
    if (newQueue != null && newQueue.isNotEmpty) {
      _currentQueue = List.from(newQueue);
      _currentIndex = _currentQueue.indexWhere((t) => t.id == track.id);
      if (_currentIndex == -1) {
        _currentQueue.insert(0, track);
        _currentIndex = 0;
      }
    } else {
      _currentQueue = [track];
      _currentIndex = 0;
    }

    // Set lock screen media metadata immediately
    mediaItem.add(track.toMediaItem());

    // Extract direct audio stream URL and feed to native ExoPlayer
    final streamUri = await _musicService.getAudioStreamUri(track.id);
    if (streamUri != null) {
      try {
        await _player.setAudioSource(
          AudioSource.uri(
            streamUri,
            headers: const {
              'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            },
          ),
        );
        mediaItem.add(track.toMediaItem(streamUri: streamUri));
        await _player.play();
      } catch (e) {
        // If stream failed, retry with unadorned AudioSource
        try {
          await _player.setAudioSource(AudioSource.uri(streamUri));
          mediaItem.add(track.toMediaItem(streamUri: streamUri));
          await _player.play();
        } catch (_) {}
      }
    }
  }

  @override
  Future<void> play() => _player.play();

  @override
  Future<void> pause() => _player.pause();

  @override
  Future<void> seek(Duration position) => _player.seek(position);

  @override
  Future<void> skipToNext() async {
    if (_currentIndex + 1 < _currentQueue.length) {
      _currentIndex++;
      await playTrack(_currentQueue[_currentIndex], _currentQueue);
    }
  }

  @override
  Future<void> skipToPrevious() async {
    if (_player.position.inSeconds > 3) {
      await _player.seek(Duration.zero);
    } else if (_currentIndex > 0) {
      _currentIndex--;
      await playTrack(_currentQueue[_currentIndex], _currentQueue);
    } else {
      await _player.seek(Duration.zero);
    }
  }

  @override
  Future<void> stop() async {
    await _player.stop();
    await super.stop();
  }
}
