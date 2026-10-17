import type { SearchResponse, ProviderInfo } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  statusCode?: number;
  provider?: string;
  durationMs?: number;

  constructor(message: string, statusCode?: number, provider?: string, durationMs?: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.provider = provider;
    this.durationMs = durationMs;
  }
}

export async function checkBackendHealth(): Promise<{ status: string; framework: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Health check returned HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    throw new ApiError(err.message || 'Backend unreachable');
  }
}

export async function fetchProviders(): Promise<ProviderInfo[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/providers`);
    if (!res.ok) throw new Error(`Failed to load providers: HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    console.warn('Using fallback provider list due to error:', err);
    return [
      {
        id: 'ytmusicapi',
        name: 'ytmusicapi (YouTube Music Engine)',
        description: 'High-fidelity search using YouTube Music\'s catalog for songs, artists, albums, and playlists without API keys.',
        isDefault: true,
        requiresExternalInstance: false
      },
      {
        id: 'youtubeexplode',
        name: 'YouTubeExplode (.NET Engine)',
        description: 'Direct scraper engine extracting search metadata from YouTube without API keys.',
        isDefault: false,
        requiresExternalInstance: false
      },
      {
        id: 'invidious',
        name: 'Invidious (Alternative Engine)',
        description: 'Open-source front-end proxy API for YouTube with configurable public instances.',
        isDefault: false,
        requiresExternalInstance: true
      }
    ];
  }
}

async function fetchFallbackSearch(query: string, limit: number, signal?: AbortSignal): Promise<SearchResponse | null> {
  const instances = [
    'https://inv.tux.pizza',
    'https://invidious.nerdvpn.de',
    'https://vid.priv.au'
  ];
  for (const instance of instances) {
    try {
      const res = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, { signal });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const items = data.slice(0, limit).map((v: any) => {
          const secs = v.lengthSeconds || 180;
          const mins = Math.floor(secs / 60);
          const remSecs = secs % 60;
          return {
            id: v.videoId,
            title: v.title || 'Untitled',
            artist: v.author || 'Unknown Artist',
            album: 'Single',
            duration: `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`,
            durationSeconds: secs,
            thumbnailUrl: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
            youtubeUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
            isEmbeddableCandidate: true,
            source: 'invidious-direct'
          };
        });
        return {
          query,
          page: 1,
          limit,
          totalReturned: items.length,
          hasMore: false,
          provider: 'invidious-direct',
          durationMs: 150,
          items
        };
      }
    } catch {
      // try next instance
    }
  }
  return null;
}

export async function searchTracks(
  query: string,
  page: number = 1,
  limit: number = 20,
  provider: string = 'ytmusicapi',
  filter?: string,
  signal?: AbortSignal
): Promise<SearchResponse> {
  const startTime = performance.now();
  let url = `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}&provider=${encodeURIComponent(provider)}`;
  if (filter && filter !== 'all') {
    url += `&filter=${encodeURIComponent(filter)}`;
  }

  try {
    const res = await fetch(url, { signal });
    const elapsed = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      const message = errorJson?.error || `Request failed with HTTP status ${res.status}`;
      throw new ApiError(message, res.status, errorJson?.provider || provider, errorJson?.durationMs ?? elapsed);
    }

    const data: SearchResponse = await res.json();
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err;
    }

    // Direct fallback for cloud deployments (e.g. Vercel) where local backend is offline
    try {
      const fallback = await fetchFallbackSearch(query, limit, signal);
      if (fallback && fallback.items.length > 0) {
        return fallback;
      }
    } catch {}

    const elapsed = Math.round(performance.now() - startTime);
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network error communicating with search backend', 0, provider, elapsed);
  }
}
