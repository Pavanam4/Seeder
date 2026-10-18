import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:audio_service/audio_service.dart';
import '../theme/app_theme.dart';
import '../services/audio_player_handler.dart';
import '../services/storage_service.dart';

class NowPlayingTheater extends StatefulWidget {
  final AudioPlayerHandler audioHandler;

  const NowPlayingTheater({Key? key, required this.audioHandler}) : super(key: key);

  @override
  State<NowPlayingTheater> createState() => _NowPlayingTheaterState();
}

class _NowPlayingTheaterState extends State<NowPlayingTheater> with SingleTickerProviderStateMixin {
  bool _showLyrics = false;
  bool _isLiked = false;
  late AnimationController _vinylController;
  final StorageService _storageService = StorageService();

  @override
  void initState() {
    super.initState();
    _vinylController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 18),
    )..repeat();
    _checkLikeStatus();
  }

  Future<void> _checkLikeStatus() async {
    final track = widget.audioHandler.currentTrack;
    if (track == null) return;
    final liked = await _storageService.getLikedTracks();
    if (mounted) {
      setState(() {
        _isLiked = liked.any((t) => t.id == track.id);
      });
    }
  }

  @override
  void dispose() {
    _vinylController.dispose();
    super.dispose();
  }

  String _formatDuration(Duration d) {
    final mins = d.inMinutes;
    final secs = d.inSeconds % 60;
    return '$mins:${secs < 10 ? '0' : ''}$secs';
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<MediaItem?>(
      stream: widget.audioHandler.mediaItem,
      builder: (context, mediaSnapshot) {
        final mediaItem = mediaSnapshot.data;
        if (mediaItem == null) return const SizedBox.shrink();

        return StreamBuilder<PlaybackState>(
          stream: widget.audioHandler.playbackState,
          builder: (context, stateSnapshot) {
            final isPlaying = stateSnapshot.data?.playing ?? false;
            final position = stateSnapshot.data?.position ?? Duration.zero;
            final duration = mediaItem.duration ?? Duration.zero;

            return Container(
              height: MediaQuery.of(context).size.height,
              width: double.infinity,
              decoration: const BoxDecoration(
                color: AppTheme.background,
              ),
              child: Stack(
                children: [
                  // Ambient blurred background using album artwork
                  if (mediaItem.artUri != null)
                    Positioned.fill(
                      child: Opacity(
                        opacity: 0.22,
                        child: CachedNetworkImage(
                          imageUrl: mediaItem.artUri.toString(),
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),

                  Positioned.fill(
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 45, sigmaY: 45),
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withOpacity(0.5),
                              AppTheme.background.withOpacity(0.92),
                              AppTheme.background,
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Main Viewport
                  SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // 1. Top Header Bar
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 34),
                                onPressed: () => Navigator.pop(context),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: const Text(
                                  'NOW PLAYING',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.2,
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                              ),
                              TextButton.icon(
                                style: TextButton.styleFrom(
                                  backgroundColor: _showLyrics ? AppTheme.accent : Colors.white10,
                                  foregroundColor: _showLyrics ? Colors.black : Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                ),
                                icon: Icon(_showLyrics ? Icons.music_note : Icons.mic_rounded, size: 16),
                                label: Text(_showLyrics ? 'Cover' : 'Lyrics', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                                onPressed: () => setState(() => _showLyrics = !_showLyrics),
                              ),
                            ],
                          ),

                          // 2. Center Stage (Album Cover or Synced Lyrics)
                          Expanded(
                            child: Center(
                              child: _showLyrics
                                  ? _buildCompactLyricsCard(mediaItem)
                                  : _buildAlbumCoverStage(mediaItem, isPlaying),
                            ),
                          ),

                          // 3. Elevated Bottom Controls (Elevated comfortably above the bottom bezel)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 24),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                // Scrubber Progress Slider
                                SliderTheme(
                                  data: SliderTheme.of(context).copyWith(
                                    trackHeight: 3.5,
                                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                                    overlayShape: const RoundSliderOverlayShape(overlayRadius: 12),
                                    activeTrackColor: AppTheme.accent,
                                    inactiveTrackColor: Colors.white24,
                                    thumbColor: Colors.white,
                                  ),
                                  child: Slider(
                                    value: position.inSeconds.toDouble().clamp(0.0, duration.inSeconds.toDouble() > 0 ? duration.inSeconds.toDouble() : 1.0),
                                    max: duration.inSeconds.toDouble() > 0 ? duration.inSeconds.toDouble() : 1.0,
                                    onChanged: (val) {
                                      widget.audioHandler.seek(Duration(seconds: val.toInt()));
                                    },
                                  ),
                                ),

                                // Time Labels
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 6),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(_formatDuration(position), style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                      Text(_formatDuration(duration), style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),

                                // Song Title + Artist + Heart
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            mediaItem.title,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppTheme.textPrimary),
                                          ),
                                          const SizedBox(height: 3),
                                          Text(
                                            mediaItem.artist ?? 'Unknown Artist',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(fontSize: 14, color: AppTheme.textSecondary),
                                          ),
                                        ],
                                      ),
                                    ),
                                    IconButton(
                                      icon: Icon(
                                        _isLiked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                                        color: _isLiked ? AppTheme.accent : AppTheme.textSecondary,
                                        size: 28,
                                      ),
                                      onPressed: () async {
                                        final track = widget.audioHandler.currentTrack;
                                        if (track != null) {
                                          final newLiked = await _storageService.toggleLike(track);
                                          setState(() => _isLiked = newLiked);
                                        }
                                      },
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),

                                // 5 Transport Controls
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.shuffle_rounded, size: 24, color: AppTheme.textSecondary),
                                      onPressed: () {},
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.skip_previous_rounded, size: 36, color: Colors.white),
                                      onPressed: () => widget.audioHandler.skipToPrevious(),
                                    ),

                                    // Main Play / Pause 58px Circle
                                    GestureDetector(
                                      onTap: () {
                                        if (isPlaying) {
                                          widget.audioHandler.pause();
                                        } else {
                                          widget.audioHandler.play();
                                        }
                                      },
                                      child: Container(
                                        width: 58,
                                        height: 58,
                                        decoration: const BoxDecoration(
                                          color: Colors.white,
                                          shape: BoxShape.circle,
                                          boxShadow: [
                                            BoxShadow(color: Colors.black45, blurRadius: 16, offset: Offset(0, 4)),
                                          ],
                                        ),
                                        child: Center(
                                          child: Icon(
                                            isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                                            color: Colors.black,
                                            size: 34,
                                          ),
                                        ),
                                      ),
                                    ),

                                    IconButton(
                                      icon: const Icon(Icons.skip_next_rounded, size: 36, color: Colors.white),
                                      onPressed: () => widget.audioHandler.skipToNext(),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.repeat_rounded, size: 24, color: AppTheme.textSecondary),
                                      onPressed: () {},
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildAlbumCoverStage(MediaItem mediaItem, bool isPlaying) {
    return Container(
      width: 290,
      height: 290,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.65),
            blurRadius: 28,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: CachedNetworkImage(
          imageUrl: mediaItem.artUri?.toString() ?? '',
          fit: BoxFit.cover,
          errorWidget: (_, __, ___) => Container(
            color: AppTheme.surfaceLight,
            child: const Icon(Icons.music_note, size: 80, color: AppTheme.textMuted),
          ),
        ),
      ),
    );
  }

  Widget _buildCompactLyricsCard(MediaItem mediaItem) {
    return Container(
      width: double.infinity,
      height: 230,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white12, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'LYRICS',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.textMuted, letterSpacing: 1),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ListView(
              children: [
                _buildLyricLine('♪ Now Playing: ${mediaItem.title} ♪', isPast: true),
                _buildLyricLine('Performed by ${mediaItem.artist}', isPast: true),
                _buildLyricLine('♪ Instrumental Prelude ♪', isPast: true),
                _buildLyricLine('♪ Catch the rhythm and feel the melody ♪', isActive: true),
                _buildLyricLine('♪ High-fidelity audio flowing effortlessly ♪'),
                _buildLyricLine('♪ Synchronized audio stream active ♪'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLyricLine(String text, {bool isActive = false, bool isPast = false}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: EdgeInsets.symmetric(horizontal: isActive ? 10 : 4, vertical: 4),
      decoration: isActive
          ? BoxDecoration(
              color: AppTheme.accent.withOpacity(0.18),
              borderRadius: BorderRadius.circular(6),
              border: const Border(left: BorderSide(color: AppTheme.accent, width: 3)),
            )
          : null,
      child: Text(
        text,
        style: TextStyle(
          fontSize: isActive ? 16 : 14,
          fontWeight: isActive ? FontWeight.w800 : FontWeight.w500,
          color: isActive ? Colors.white : (isPast ? Colors.white38 : Colors.white60),
        ),
      ),
    );
  }
}
