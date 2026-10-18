import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/track.dart';
import '../models/playlist.dart';

class StorageService {
  static const String _likedTracksKey = 'seeder_liked_tracks';
  static const String _playlistsKey = 'seeder_playlists';
  static const String _recentTracksKey = 'seeder_recent_tracks';

  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  // Liked Tracks
  Future<List<MusicTrack>> getLikedTracks() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_likedTracksKey);
    if (data == null) return [];
    try {
      final list = jsonDecode(data) as List<dynamic>;
      return list.map((t) => MusicTrack.fromJson(t)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<void> saveLikedTracks(List<MusicTrack> tracks) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonList = tracks.map((t) => t.toJson()).toList();
    await prefs.setString(_likedTracksKey, jsonEncode(jsonList));
  }

  Future<bool> isLiked(String trackId) async {
    final list = await getLikedTracks();
    return list.any((t) => t.id == trackId);
  }

  Future<bool> toggleLike(MusicTrack track) async {
    final list = await getLikedTracks();
    final exists = list.any((t) => t.id == track.id);
    if (exists) {
      list.removeWhere((t) => t.id == track.id);
    } else {
      list.insert(0, track);
    }
    await saveLikedTracks(list);
    return !exists;
  }

  // Playlists
  Future<List<Playlist>> getPlaylists() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getString(_playlistsKey);
    if (data == null) return [];
    try {
      final list = jsonDecode(data) as List<dynamic>;
      return list.map((p) => Playlist.fromJson(p)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<void> savePlaylists(List<Playlist> playlists) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonList = playlists.map((p) => p.toJson()).toList();
    await prefs.setString(_playlistsKey, jsonEncode(jsonList));
  }

  Future<void> createPlaylist(String name, [MusicTrack? initialTrack]) async {
    final list = await getPlaylists();
    final newPlaylist = Playlist(
      id: 'playlist_${DateTime.now().millisecondsSinceEpoch}',
      name: name,
      description: 'Custom created playlist',
      coverUrl: initialTrack?.thumbnailUrl,
      createdAt: DateTime.now().toIso8601String(),
      tracks: initialTrack != null ? [initialTrack] : [],
    );
    list.insert(0, newPlaylist);
    await savePlaylists(list);
  }
}
