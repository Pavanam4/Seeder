export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  durationSeconds?: number;
  thumbnailUrl: string;
  youtubeUrl: string;
  resultType?: string;
  source?: string;
  isEmbeddableCandidate: boolean;
}

export type SearchFilterType = 'all' | 'songs' | 'artists' | 'albums' | 'playlists' | 'new_releases';

export type ThemePalette = 'noir' | 'amber' | 'aurora' | 'cyber';

export type RepeatMode = 'off' | 'all' | 'one';

export type AudioQuality = 'highres' | 'hd1080' | 'hd720' | 'medium' | 'small' | 'auto';

export type AudioNormalizationMode = 'balanced' | 'loud' | 'soft' | 'off';

export type ViewType = 'home' | 'search' | 'playlist' | 'liked' | 'library' | 'settings';

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  tracks: MusicTrack[];
  isCustom?: boolean;
  createdAt: string;
}

export interface SearchResponse {
  provider: string;
  query: string;
  page: number;
  limit: number;
  durationMs: number;
  totalReturned: number;
  hasMore: boolean;
  items: MusicTrack[];
  errorMessage?: string | null;
  statusCode?: number | null;
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  requiresExternalInstance: boolean;
}

export type YTPlayerStateName =
  | 'UNINITIALIZED'
  | 'UNSTARTED'
  | 'ENDED'
  | 'PLAYING'
  | 'PAUSED'
  | 'BUFFERING'
  | 'CUED';

export interface PlayerErrorInfo {
  code: number;
  title: string;
  description: string;
  isEmbedRestricted: boolean;
}

export interface SearchDiagnostics {
  provider: string;
  durationMs: number;
  totalReturned: number;
  httpStatus: number | null;
  timestamp: string;
  error?: string | null;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  username?: string;
  photoUrl?: string;
  provider: 'google' | 'github' | 'twitter' | 'phone' | 'guest';
  createdAt: string;
}

export interface PlaybackSession {
  track: MusicTrack;
  currentTime: number;
  duration?: number;
  queue: MusicTrack[];
  savedAt: number;
  isPlaying?: boolean;
  deviceId?: string;
  deviceName?: string;
}

