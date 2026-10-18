import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../theme/app_theme.dart';
import '../models/track.dart';
import '../services/music_service.dart';
import '../services/audio_player_handler.dart';

class HomeScreen extends StatefulWidget {
  final AudioPlayerHandler audioHandler;

  const HomeScreen({super.key, required this.audioHandler});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final MusicService _musicService = MusicService();
  String _selectedLanguage = 'all';

  List<MusicTrack> _trendingTracks = [];
  List<MusicTrack> _regionalTracks = [];
  bool _isLoading = true;

  final List<Map<String, String>> _languages = [
    {'key': 'all', 'name': 'All'},
    {'key': 'malayalam', 'name': 'Malayalam'},
    {'key': 'hindi', 'name': 'Hindi'},
    {'key': 'tamil', 'name': 'Tamil'},
    {'key': 'english', 'name': 'English'},
    {'key': 'punjabi', 'name': 'Punjabi'},
  ];

  @override
  void initState() {
    super.initState();
    _loadFeeds();
  }

  Future<void> _loadFeeds() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _musicService.getMadeForYouFeed(),
        _musicService.getRegionalFeed(_selectedLanguage),
      ]);

      if (mounted) {
        setState(() {
          _trendingTracks = results[0];
          _regionalTracks = results[1];
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppTheme.accent,
          backgroundColor: AppTheme.surface,
          onRefresh: _loadFeeds,
          child: ListView(
            padding: const EdgeInsets.only(bottom: 130),
            children: [
              // Header Greeting & Brand
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _getGreeting(),
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.graphic_eq_rounded, size: 14, color: AppTheme.accent),
                          SizedBox(width: 6),
                          Text('Seeder.play', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Language Filter Chips
              SizedBox(
                height: 44,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _languages.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final lang = _languages[index];
                    final isSelected = _selectedLanguage == lang['key'];
                    return ChoiceChip(
                      label: Text(lang['name']!),
                      selected: isSelected,
                      selectedColor: AppTheme.accent,
                      backgroundColor: AppTheme.surfaceLight,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : AppTheme.textSecondary,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      onSelected: (val) {
                        if (val) {
                          setState(() => _selectedLanguage = lang['key']!);
                          _loadFeeds();
                        }
                      },
                    );
                  },
                ),
              ),

              const SizedBox(height: 18),

              // Section 1: Made For You Carousel
              _buildSectionHeader('Made For You', 'Popular hits tailored to your taste'),
              if (_isLoading && _trendingTracks.isEmpty)
                _buildSkeletonHorizontalList()
              else if (_trendingTracks.isEmpty)
                _buildEmptyState()
              else
                SizedBox(
                  height: 205,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _trendingTracks.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 14),
                    itemBuilder: (context, index) {
                      final track = _trendingTracks[index];
                      return _buildTrackCard(track, _trendingTracks);
                    },
                  ),
                ),

              const SizedBox(height: 24),

              // Section 2: Regional Hits (e.g. Malayalam, Hindi, Tamil)
              _buildSectionHeader(
                _selectedLanguage == 'all'
                    ? 'Trending Worldwide'
                    : '${_languages.firstWhere((l) => l['key'] == _selectedLanguage)['name']} Hot Hits',
                'Top streamed tracks right now',
              ),
              if (_isLoading && _regionalTracks.isEmpty)
                _buildSkeletonVerticalList()
              else if (_regionalTracks.isEmpty)
                _buildEmptyState()
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _regionalTracks.length,
                  itemBuilder: (context, index) {
                    final track = _regionalTracks[index];
                    return _buildTrackListItem(track, _regionalTracks);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: AppTheme.textPrimary)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
        ],
      ),
    );
  }

  Widget _buildTrackCard(MusicTrack track, List<MusicTrack> queue) {
    return GestureDetector(
      onTap: () => widget.audioHandler.playTrack(track, queue),
      child: Container(
        width: 140,
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.border),
        ),
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Stack(
                children: [
                  CachedNetworkImage(
                    imageUrl: track.thumbnailUrl,
                    width: 120,
                    height: 120,
                    fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => Container(
                      width: 120,
                      height: 120,
                      color: AppTheme.surfaceLight,
                      child: const Icon(Icons.music_note, color: AppTheme.accent),
                    ),
                  ),
                  Positioned(
                    bottom: 6,
                    right: 6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: AppTheme.accent,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.play_arrow_rounded, size: 16, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              track.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 2),
            Text(
              track.artist,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrackListItem(MusicTrack track, List<MusicTrack> queue) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      decoration: BoxDecoration(
        color: AppTheme.surface.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: CachedNetworkImage(
            imageUrl: track.thumbnailUrl,
            width: 50,
            height: 50,
            fit: BoxFit.cover,
            errorWidget: (_, __, ___) => Container(
              width: 50,
              height: 50,
              color: AppTheme.surfaceLight,
              child: const Icon(Icons.music_note, color: AppTheme.accent),
            ),
          ),
        ),
        title: Text(
          track.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
        ),
        subtitle: Text(
          track.artist,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(track.duration, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.accent.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.play_arrow_rounded, size: 20, color: AppTheme.accent),
            ),
          ],
        ),
        onTap: () => widget.audioHandler.playTrack(track, queue),
      ),
    );
  }

  Widget _buildSkeletonHorizontalList() {
    return SizedBox(
      height: 205,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: 4,
        separatorBuilder: (_, __) => const SizedBox(width: 14),
        itemBuilder: (_, __) => Container(
          width: 140,
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: AppTheme.surfaceLight,
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              const SizedBox(height: 10),
              Container(width: 80, height: 12, color: AppTheme.surfaceLight),
              const SizedBox(height: 6),
              Container(width: 50, height: 10, color: AppTheme.surfaceLight),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSkeletonVerticalList() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: List.generate(
          4,
          (_) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            height: 64,
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: ElevatedButton.icon(
          onPressed: _loadFeeds,
          icon: const Icon(Icons.refresh_rounded, color: Colors.white),
          label: const Text('Refresh Music Feed', style: TextStyle(color: Colors.white)),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.accent,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          ),
        ),
      ),
    );
  }
}
