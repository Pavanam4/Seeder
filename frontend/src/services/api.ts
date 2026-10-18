import type { SearchResponse, ProviderInfo, MusicTrack } from '../types';

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
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || contentType.includes('text/html')) {
      return { status: 'cloud-mode', framework: 'Vercel Direct' };
    }
    return await res.json();
  } catch {
    return { status: 'cloud-mode', framework: 'Vercel Direct' };
  }
}

export async function fetchProviders(): Promise<ProviderInfo[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/providers`);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || contentType.includes('text/html')) {
      throw new Error('Not available');
    }
    return await res.json();
  } catch {
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
  // 1. Try Invidious CORS-enabled public endpoints directly (returns direct 11-char YouTube video IDs)
  const invidiousInstances = [
    'https://invidious.jing.rocks',
    'https://inv.nadeko.net',
    'https://iv.ggtyler.dev',
    'https://invidious.nerdvpn.de',
  ];

  for (const instance of invidiousInstances) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const combinedSignal = signal || controller.signal;

      const res = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
        signal: combinedSignal,
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || contentType.includes('text/html')) continue;

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const items: MusicTrack[] = data
          .filter((v: any) => v.videoId && v.videoId.length === 11)
          .slice(0, limit)
          .map((v: any) => {
            const secs = v.lengthSeconds || 180;
            const mins = Math.floor(secs / 60);
            const remSecs = secs % 60;
            return {
              id: v.videoId,
              title: v.title || 'Untitled Track',
              artist: v.author || 'Unknown Artist',
              album: 'Single',
              duration: `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`,
              durationSeconds: secs,
              thumbnailUrl:
                v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
              youtubeUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
              isEmbeddableCandidate: true,
              source: 'invidious-direct',
            };
          });

        if (items.length > 0) {
          return {
            query,
            page: 1,
            limit,
            totalReturned: items.length,
            hasMore: false,
            provider: 'invidious-direct',
            durationMs: 250,
            items,
          };
        }
      }
    } catch {
      // try next instance
    }
  }

  // 2. High-speed global iTunes catalog fallback
  try {
    let itunesQuery = query;
    const lower = query.toLowerCase();
    if (lower === 'new releases' || lower === 'latest releases' || lower === 'recent releases') {
      itunesQuery = 'Top Popular Music Hits';
    } else if (lower.includes('trending')) {
      itunesQuery = 'Top Global Pop Hits';
    }

    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(itunesQuery)}&entity=song&limit=${limit}`;
    const res = await fetch(itunesUrl, { signal });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        const items: MusicTrack[] = data.results.map((r: any) => {
          const totalSecs = Math.round((r.trackTimeMillis || 180000) / 1000);
          const mins = Math.floor(totalSecs / 60);
          const remSecs = totalSecs % 60;
          const art = (r.artworkUrl100 || '').replace('100x100bb', '600x600bb');
          return {
            id: String(r.trackId),
            title: r.trackName || 'Untitled',
            artist: r.artistName || 'Unknown Artist',
            album: r.collectionName || 'Single',
            duration: `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`,
            durationSeconds: totalSecs,
            thumbnailUrl: art || `https://i.ytimg.com/vi/${r.trackId}/hqdefault.jpg`,
            youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${r.trackName} ${r.artistName}`)}`,
            isEmbeddableCandidate: false, // forces PlayerTestPanel to dynamically resolve 11-char YouTube ID
            source: 'itunes-cloud',
          };
        });

        return {
          query,
          page: 1,
          limit,
          totalReturned: items.length,
          hasMore: false,
          provider: 'itunes-catalog',
          durationMs: 180,
          items,
        };
      }
    }
  } catch {
    // fallback exhausted
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
    const contentType = res.headers.get('content-type') || '';
    const elapsed = Math.round(performance.now() - startTime);

    // If server returned non-JSON (e.g. Vercel SPA index.html fallback) or HTTP error:
    if (!res.ok || contentType.includes('text/html')) {
      throw new Error(`Backend not available on this host (${res.status})`);
    }

    const data: SearchResponse = await res.json();
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err;
    }

    // Direct cloud search for deployments (e.g. Vercel) where local ASP.NET backend is offline
    try {
      const fallback = await fetchFallbackSearch(query, limit, signal);
      if (fallback && fallback.items.length > 0) {
        return fallback;
      }
    } catch (fallbackErr) {
      console.warn('Fallback search encountered error:', fallbackErr);
    }

    const elapsed = Math.round(performance.now() - startTime);
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError('Unable to connect to search service. Please try again.', 0, provider, elapsed);
  }
}
