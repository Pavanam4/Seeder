import type { Playlist, MusicTrack, ThemePalette, AudioQuality, AudioNormalizationMode } from '../types';

const PLAYLISTS_STORAGE_KEY = 'music_fetcher_playlists';
const LIKED_TRACKS_STORAGE_KEY = 'music_fetcher_liked_tracks';
const THEME_STORAGE_KEY = 'music_fetcher_theme_v2';
const VOLUME_STORAGE_KEY = 'music_fetcher_volume';

const DEFAULT_SEED_PLAYLISTS: Playlist[] = [
  {
    id: 'playlist-synthwave',
    name: 'Synthwave & Midnight Drive',
    description: 'Neon retrosynth, outrun beats, and cinematic late-night synthesizers.',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=60',
    createdAt: new Date().toISOString(),
    isCustom: false,
    tracks: [
      {
        id: '4D7u5KF7SP8',
        title: 'Get Lucky (feat. Pharrell Williams and Nile Rodgers)',
        artist: 'Daft Punk',
        album: 'Random Access Memories',
        duration: '6:10',
        durationSeconds: 370,
        thumbnailUrl: 'https://i.ytimg.com/vi/4D7u5KF7SP8/hqdefault.jpg',
        youtubeUrl: 'https://www.youtube.com/watch?v=4D7u5KF7SP8',
        resultType: 'song',
        source: 'ytmusicapi',
        isEmbeddableCandidate: true,
      },
      {
        id: 'dX3k_QDnzHE',
        title: 'Midnight City',
        artist: 'M83',
        album: "Hurry Up, We're Dreaming",
        duration: '4:04',
        durationSeconds: 244,
        thumbnailUrl: 'https://i.ytimg.com/vi/dX3k_QDnzHE/hqdefault.jpg',
        youtubeUrl: 'https://www.youtube.com/watch?v=dX3k_QDnzHE',
        resultType: 'song',
        source: 'ytmusicapi',
        isEmbeddableCandidate: true,
      },
      {
        id: 'MV_3Dpw-BRY',
        title: 'Nightcall',
        artist: 'Kavinsky',
        album: 'OutRun',
        duration: '4:19',
        durationSeconds: 259,
        thumbnailUrl: 'https://i.ytimg.com/vi/MV_3Dpw-BRY/hqdefault.jpg',
        youtubeUrl: 'https://www.youtube.com/watch?v=MV_3Dpw-BRY',
        resultType: 'song',
        source: 'ytmusicapi',
        isEmbeddableCandidate: true,
      },
    ],
  },
  {
    id: 'playlist-focus',
    name: 'Deep Focus & Study',
    description: 'Atmospheric textures and acoustic instrumentals to help you zone in.',
    coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=60',
    createdAt: new Date().toISOString(),
    isCustom: false,
    tracks: [
      {
        id: 'RxabV9hc8PU',
        title: 'Time',
        artist: 'Hans Zimmer',
        album: 'Inception (Music from the Motion Picture)',
        duration: '4:35',
        durationSeconds: 275,
        thumbnailUrl: 'https://i.ytimg.com/vi/RxabV9hc8PU/hqdefault.jpg',
        youtubeUrl: 'https://www.youtube.com/watch?v=RxabV9hc8PU',
        resultType: 'song',
        source: 'ytmusicapi',
        isEmbeddableCandidate: true,
      },
      {
        id: 'fBNz545NYj8',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        album: 'After Hours',
        duration: '3:20',
        durationSeconds: 200,
        thumbnailUrl: 'https://i.ytimg.com/vi/fBNz545NYj8/hqdefault.jpg',
        youtubeUrl: 'https://www.youtube.com/watch?v=fBNz545NYj8',
        resultType: 'song',
        source: 'ytmusicapi',
        isEmbeddableCandidate: true,
      },
    ],
  },
];

const DEFAULT_LIKED_TRACKS: MusicTrack[] = [
  {
    id: '4D7u5KF7SP8',
    title: 'Get Lucky (feat. Pharrell Williams and Nile Rodgers)',
    artist: 'Daft Punk',
    album: 'Random Access Memories',
    duration: '6:10',
    durationSeconds: 370,
    thumbnailUrl: 'https://i.ytimg.com/vi/4D7u5KF7SP8/hqdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=4D7u5KF7SP8',
    resultType: 'song',
    source: 'ytmusicapi',
    isEmbeddableCandidate: true,
  },
  {
    id: '1G4isv_Fylg',
    title: 'Paradise',
    artist: 'Coldplay',
    album: 'Mylo Xyloto',
    duration: '4:38',
    durationSeconds: 278,
    thumbnailUrl: 'https://i.ytimg.com/vi/1G4isv_Fylg/hqdefault.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=1G4isv_Fylg',
    resultType: 'song',
    source: 'ytmusicapi',
    isEmbeddableCandidate: true,
  },
];

// Playlists
export function loadPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
    if (!raw) {
      savePlaylists(DEFAULT_SEED_PLAYLISTS);
      return DEFAULT_SEED_PLAYLISTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SEED_PLAYLISTS;
  } catch {
    return DEFAULT_SEED_PLAYLISTS;
  }
}

export function savePlaylists(playlists: Playlist[]): void {
  try {
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
  } catch (err) {
    console.error('Failed to save playlists to localStorage', err);
  }
}

// Liked Tracks
export function loadLikedTracks(): MusicTrack[] {
  try {
    const raw = localStorage.getItem(LIKED_TRACKS_STORAGE_KEY);
    if (!raw) {
      saveLikedTracks(DEFAULT_LIKED_TRACKS);
      return DEFAULT_LIKED_TRACKS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_LIKED_TRACKS;
  } catch {
    return DEFAULT_LIKED_TRACKS;
  }
}

export function saveLikedTracks(tracks: MusicTrack[]): void {
  try {
    localStorage.setItem(LIKED_TRACKS_STORAGE_KEY, JSON.stringify(tracks));
  } catch (err) {
    console.error('Failed to save liked tracks', err);
  }
}

// Theme
export function loadTheme(): ThemePalette {
  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY) as ThemePalette;
    if (theme === 'cyber' || theme === 'amber' || theme === 'aurora') {
      return theme;
    }
    return 'amber';
  } catch {
    return 'amber';
  }
}

export function saveTheme(theme: ThemePalette): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (err) {
    console.error('Failed to save theme', err);
  }
}

// Volume
export function loadVolume(): number {
  try {
    const v = localStorage.getItem(VOLUME_STORAGE_KEY);
    return v ? Math.max(0, Math.min(100, parseInt(v, 10))) : 80;
  } catch {
    return 80;
  }
}

export function saveVolume(vol: number): void {
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, vol.toString());
  } catch (err) {
    console.error('Failed to save volume', err);
  }
}

const QUALITY_STORAGE_KEY = 'music_fetcher_audio_quality';

export function loadAudioQuality(): AudioQuality {
  try {
    const q = localStorage.getItem(QUALITY_STORAGE_KEY) as AudioQuality;
    if (q === 'highres' || q === 'hd1080' || q === 'hd720' || q === 'medium' || q === 'small' || q === 'auto') {
      return q;
    }
    return 'highres';
  } catch {
    return 'highres';
  }
}

export function saveAudioQuality(quality: AudioQuality): void {
  try {
    localStorage.setItem(QUALITY_STORAGE_KEY, quality);
  } catch (err) {
    console.error('Failed to save audio quality', err);
  }
}

const NORMALIZATION_STORAGE_KEY = 'music_fetcher_audio_normalization';

export function loadAudioNormalization(): AudioNormalizationMode {
  try {
    const n = localStorage.getItem(NORMALIZATION_STORAGE_KEY) as AudioNormalizationMode;
    if (n === 'balanced' || n === 'loud' || n === 'soft' || n === 'off') {
      return n;
    }
    return 'balanced';
  } catch {
    return 'balanced';
  }
}

export function saveAudioNormalization(mode: AudioNormalizationMode): void {
  try {
    localStorage.setItem(NORMALIZATION_STORAGE_KEY, mode);
  } catch (err) {
    console.error('Failed to save audio normalization', err);
  }
}

const LANGUAGE_STORAGE_KEY = 'music_fetcher_language';
const SEARCH_HISTORY_KEY = 'music_fetcher_search_history';
const RECENT_ARTISTS_KEY = 'music_fetcher_recent_artists';

export function loadMusicLanguage(): string {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'all';
  } catch {
    return 'all';
  }
}

export function saveMusicLanguage(lang: string): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (err) {
    console.error('Failed to save music language', err);
  }
}

export function loadSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSearchQuery(query: string): void {
  const clean = query.trim();
  if (!clean || clean.length < 2) return;
  try {
    const history = loadSearchHistory();
    const updated = [clean, ...history.filter((q) => q.toLowerCase() !== clean.toLowerCase())].slice(0, 15);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save search history', err);
  }
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (err) {
    console.error('Failed to clear search history', err);
  }
}

export function loadRecentArtists(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_ARTISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentArtist(artist: string): void {
  const clean = artist.trim();
  if (!clean || clean.length < 2) return;
  try {
    const artists = loadRecentArtists();
    const updated = [clean, ...artists.filter((a) => a.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
    localStorage.setItem(RECENT_ARTISTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save recent artists', err);
  }
}

export function getUserTasteProfile(likedTracks: MusicTrack[], recentTracks: MusicTrack[]): string[] {
  const artists: string[] = [];
  // 1. Artists from liked tracks
  for (const t of likedTracks) {
    if (t.artist && !artists.includes(t.artist)) {
      artists.push(t.artist);
    }
  }
  // 2. Artists from recent played tracks
  for (const t of recentTracks) {
    if (t.artist && !artists.includes(t.artist)) {
      artists.push(t.artist);
    }
  }
  // 3. Search queries
  const searches = loadSearchHistory();
  for (const s of searches) {
    if (!artists.includes(s)) {
      artists.push(s);
    }
  }
  return artists.slice(0, 10);
}
