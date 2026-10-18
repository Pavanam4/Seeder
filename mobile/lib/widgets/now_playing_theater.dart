import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:audio_service/audio_service.dart';
import '../theme/app_theme.dart';
import '../services/audio_player_handler.dart';
import '../services/storage_service.dart';

class NowPlayingTheater extends StatefulWidget {
  final AudioPlayerHandler audioHandler;

  const NowPlayingTheater({super.key, required this.audioHandler});

  @override
  State<NowPlayingTheater> createState() => _NowPlayingTheaterState();
}

class _NowPlayingTheaterState extends State<NowPlayingTheater> {
  bool _showLyrics = false;
  bool _isLiked = false;
  final StorageService _storageService = StorageService();

  @override
  void initState() {
    super.initState();
    _checkLikedStatus();
  }

  Future<void> _checkLikedStatus() async {
    final track = widget.audioHandler.currentTrack;
    if (track != null) {
      final liked = await _storageService.isLiked(track.id);
      if (mounted) setState(() => _isLiked = liked);
    }
  }

  String _formatDuration(Duration d) {
    final mins = d.inMinutes;
    final secs = d.inSeconds % 60;
    return '$mins:${secs < 10 ? '0' : ''}$secs';
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final viewPadding = MediaQueryData.fromView(View.of(context)).padding;
    final topPadding = viewPadding.top > 0 ? viewPadding.top : mediaQuery.padding.top;
    final bottomPadding = viewPadding.bottom > 0 ? viewPadding.bottom : mediaQuery.padding.bottom;
    final screenHeight = mediaQuery.size.height;

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
              height: screenHeight,
              width: double.infinity,
              color: AppTheme.background,
              child: Stack(
                children: [
                  // Ambient blurred background using album artwork
                  if (mediaItem.artUri != null)
                    Positioned.fill(
                      child: Opacity(
                        opacity: 0.28,
                        child: CachedNetworkImage(
                          imageUrl: mediaItem.artUri.toString(),
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),

                  Positioned.fill(
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 55, sigmaY: 55),
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withValues(alpha: 0.65),
                              AppTheme.background.withValues(alpha: 0.90),
                              AppTheme.background,
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Main Viewport with Explicit Safe Paddings
                  Column(
                    children: [
                      // 1. Top Header Bar (Explicitly below notch and status bar)
                      Container(
                        padding: EdgeInsets.fromLTRB(16, topPadding + 14, 16, 6),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 34, color: Colors.white),
                              onPressed: () => Navigator.pop(context),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                              decoration: BoxDecoration(
                                color: AppTheme.surface.withValues(alpha: 0.8),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: AppTheme.border),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.graphic_eq_rounded, size: 13, color: AppTheme.accent),
                                  SizedBox(width: 6),
                                  Text(
                                    'NOW PLAYING',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 1.2,
                                      color: AppTheme.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            TextButton.icon(
                              style: TextButton.styleFrom(
                                backgroundColor: _showLyrics ? AppTheme.accent : AppTheme.surface,
                                foregroundColor: _showLyrics ? Colors.white : AppTheme.textSecondary,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(20),
                                  side: BorderSide(
                                    color: _showLyrics ? AppTheme.accent : AppTheme.border,
                                  ),
                                ),
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              ),
                              icon: Icon(_showLyrics ? Icons.music_note_rounded : Icons.mic_rounded, size: 16),
                              label: Text(
                                _showLyrics ? 'Cover' : 'Lyrics',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                              ),
                              onPressed: () => setState(() => _showLyrics = !_showLyrics),
                            ),
                          ],
                        ),
                      ),

                      // 2. Center Stage (Album Cover or Synced Lyrics)
                      Expanded(
                        child: Center(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                            child: _showLyrics
                                ? _buildCompactLyricsCard(mediaItem)
                                : _buildAlbumCoverStage(mediaItem, isPlaying, screenHeight),
                          ),
                        ),
                      ),

                      // 3. Elevated Bottom Controls (Elevated safely above the gesture pill)
                      Container(
                        padding: EdgeInsets.fromLTRB(24, 6, 24, bottomPadding + 36),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
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
                                        style: const TextStyle(
                                          fontSize: 20,
                                          fontWeight: FontWeight.w800,
                                          color: AppTheme.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        mediaItem.artist ?? 'Unknown Artist',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          color: AppTheme.textSecondary,
                                        ),
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

                            const SizedBox(height: 10),

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
                                value: position.inSeconds.toDouble().clamp(
                                  0.0,
                                  duration.inSeconds.toDouble() > 0 ? duration.inSeconds.toDouble() : 1.0,
                                ),
                                max: duration.inSeconds.toDouble() > 0 ? duration.inSeconds.toDouble() : 1.0,
                                onChanged: (val) {
                                  widget.audioHandler.seek(Duration(seconds: val.toInt()));
                                },
                              ),
                            ),

                            // Time Labels
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 4),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(_formatDuration(position), style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                  Text(_formatDuration(duration), style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                ],
                              ),
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

                                // Main Play / Pause Circle in Cyber Violet Accent
                                GestureDetector(
                                  onTap: () {
                                    if (isPlaying) {
                                      widget.audioHandler.pause();
                                    } else {
                                      widget.audioHandler.play();
                                    }
                                  },
                                  child: Container(
                                    width: 62,
                                    height: 62,
                                    decoration: BoxDecoration(
                                      color: AppTheme.accent,
                                      shape: BoxShape.circle,
                                      boxShadow: [
                                        BoxShadow(
                                          color: AppTheme.accent.withValues(alpha: 0.45),
                                          blurRadius: 18,
                                          offset: const Offset(0, 5),
                                        ),
                                      ],
                                    ),
                                    child: Center(
                                      child: Icon(
                                        isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                                        color: Colors.white,
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
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildAlbumCoverStage(MediaItem mediaItem, bool isPlaying, double screenHeight) {
    // Dynamic sizing responsive to phone screen height
    final double artSize = (screenHeight * 0.36).clamp(240.0, 320.0);

    return Container(
      width: artSize,
      height: artSize,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppTheme.accent.withValues(alpha: 0.25),
            blurRadius: 32,
            offset: const Offset(0, 10),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.7),
            blurRadius: 20,
            offset: const Offset(0, 14),
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
      constraints: const BoxConstraints(maxHeight: 260),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.surface.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.accent.withValues(alpha: 0.25), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.lyrics_rounded, size: 16, color: AppTheme.accent),
              const SizedBox(width: 8),
              Text(
                'LYRICS PREVIEW',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.accent.withValues(alpha: 0.9),
                  letterSpacing: 1.1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Expanded(
            child: SingleChildScrollView(
              child: Text(
                'Lyrics for "${mediaItem.title}" by ${mediaItem.artist}...\n\n♪ Instrumental intro ♪\n\n(Lyrics automatically synced from LRCLIB & YouTube)',
                style: const TextStyle(
                  fontSize: 15,
                  height: 1.6,
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
