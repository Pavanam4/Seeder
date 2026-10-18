import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../theme/app_theme.dart';
import '../models/track.dart';
import '../services/music_service.dart';
import '../services/audio_player_handler.dart';

class HomeScreen extends StatefulWidget {
  final AudioPlayerHandler audioHandler;

  const HomeScreen({Key? key, required this.audioHandler}) : super(key: key);

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
    final trending = await _musicService.search('Trending Hits 2024', limit: 10);
    final regional = await _musicService.getRegionalFeed(_selectedLanguage);

    if (mounted) {
      setState(() {
        _trendingTracks = trending;
        _regionalTracks = regional;
        _isLoading = false;
      });
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
            padding: const EdgeInsets.only(bottom: 120),
            children: [
              // Header Greeting & Brand
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
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
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.graphic_eq_rounded, size: 14, color: AppTheme.accent),
                          SizedBox(width: 6),
                          Text('Seeder.play', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Language Filter Chips
              SizedBox(
                height: 48,
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
                        color: isSelected ? Colors.black : AppTheme.textSecondary,
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

              const SizedBox(height: 16),

              // Section 1: Made For You Carousel
              _buildSectionHeader('Made For You', 'Popular hits tailored to your taste'),
              if (_isLoading)
                const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator(color: AppTheme.accent)))
              else
                SizedBox(
                  height: 200,
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
                _selectedLanguage == 'all' ? 'Trending Worldwide' : '${_languages.firstWhere((l) => l['key'] == _selectedLanguage)['name']} Hot Hits',
                'Top streamed tracks right now',
              ),
              if (_isLoading)
                const SizedBox.shrink()
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
        width: 135,
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
              child: CachedNetworkImage(
                imageUrl: track.thumbnailUrl,
                width: 115,
                height: 115,
                fit: BoxFit.cover,
                errorWidget: (_, __, ___) => Container(color: AppTheme.surfaceLight, child: const Icon(Icons.music_note)),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              track.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
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
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(vertical: 4),
      leading: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: CachedNetworkImage(
          imageUrl: track.thumbnailUrl,
          width: 50,
          height: 50,
          fit: BoxFit.cover,
          errorWidget: (_, __, ___) => Container(width: 50, height: 50, color: AppTheme.surfaceLight),
        ),
      ),
      title: Text(track.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
      subtitle: Text(track.artist, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(track.duration, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
          const SizedBox(width: 8),
          const Icon(Icons.play_circle_outline_rounded, size: 24, color: AppTheme.accent),
        ],
      ),
      onTap: () => widget.audioHandler.playTrack(track, queue),
    );
  }
}
