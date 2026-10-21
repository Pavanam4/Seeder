import type { Playlist, MusicTrack } from '../types';
import { searchTracks } from './api';

const AUTO_MIXES_CACHE_KEY = 'seeder_auto_mixes_cache_v3';

// Pure music cleaner to guarantee no podcasts, motivational speeches, or talks slip in
export function filterMusicTracks(tracks: MusicTrack[]): MusicTrack[] {
  const badWords = [
    'podcast',
    'episode',
    'motivational',
    'motivation',
    'speech',
    'interview',
    'speaks',
    'tedx',
    'vlog',
    'review',
    'trailer',
    'reaction',
    'full movie',
    'web series',
    'audiobook',
    'news',
    'listen to this every day',
    'morning motivation',
    'the entrepreneur',
  ];

  return tracks.filter((t) => {
    const text = `${t.title || ''} ${t.artist || ''} ${t.album || ''}`.toLowerCase();
    if (badWords.some((w) => text.includes(w))) return false;
    // Exclude non-music talks (> 10 mins)
    if (t.durationSeconds && t.durationSeconds > 600) return false;
    return true;
  });
}

// Fallback high-fidelity seeds for instant zero-latency startup
const SEED_DAILY_MIX_1_TRACKS: MusicTrack[] = [
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
];

const INITIAL_DEFAULT_AUTO_MIXES: Playlist[] = [
  {
    id: 'auto-mix-daily-1',
    name: 'Daily Mix 1',
    description: 'Daft Punk, Coldplay, The Weeknd, M83 and more',
    coverUrl: 'https://i.ytimg.com/vi/4D7u5KF7SP8/hqdefault.jpg',
    createdAt: new Date().toISOString(),
    isCustom: false,
    tracks: SEED_DAILY_MIX_1_TRACKS,
  },
  {
    id: 'auto-mix-daily-2',
    name: 'Daily Mix 2',
    description: 'The Weeknd, Kavinsky, Synthwave & Midnight Beats',
    coverUrl: 'https://i.ytimg.com/vi/fBNz545NYj8/hqdefault.jpg',
    createdAt: new Date().toISOString(),
    isCustom: false,
    tracks: [
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
    ],
  },
  {
    id: 'auto-mix-focus',
    name: 'Deep Focus & Flow',
    description: 'Hans Zimmer, Ludovico Einaudi, Max Richter & Ambient',
    coverUrl: 'https://i.ytimg.com/vi/RxabV9hc8PU/hqdefault.jpg',
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
    ],
  },
  {
    id: 'auto-mix-lofi',
    name: 'Midnight Lo-Fi Chill',
    description: 'Mellow beats and gentle vinyl rhythms for late night listening',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=60',
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

export function getCachedAutoMixes(language: string = 'all'): Playlist[] {
  try {
    const raw = localStorage.getItem(`${AUTO_MIXES_CACHE_KEY}_${language}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_DEFAULT_AUTO_MIXES;
}

export function saveCachedAutoMixes(language: string, mixes: Playlist[]): void {
  try {
    localStorage.setItem(`${AUTO_MIXES_CACHE_KEY}_${language}`, JSON.stringify(mixes));
  } catch (e) {
    console.warn('Could not cache auto mixes', e);
  }
}

// Generates real, living auto mixes populated with authentic tracks and real artwork
export async function generateAlgorithmicMixes(
  tasteProfile: string[],
  likedTracks: MusicTrack[],
  language: string = 'all'
): Promise<Playlist[]> {
  const artist1 = tasteProfile[0] || likedTracks[0]?.artist || (language !== 'all' ? `${language} hits` : 'Coldplay');
  const artist2 = tasteProfile[1] || likedTracks[1]?.artist || 'The Weeknd';

  const getArtistSummary = (tracks: MusicTrack[], fallback: string) => {
    const names = Array.from(new Set(tracks.map((t) => t.artist).filter(Boolean)));
    if (names.length >= 3) {
      return `${names[0]}, ${names[1]}, ${names[2]} and more`;
    }
    if (names.length >= 1) {
      return `${names.join(', ')} and more`;
    }
    return fallback;
  };

  const langLabel = language && language !== 'all' ? language.charAt(0).toUpperCase() + language.slice(1) : 'Global Hits';

  const q1 = `${artist1} radio top songs`;
  const q2 = `${artist2} radio songs`;
  const q3 = language && language !== 'all' ? `${language} top hits blockbuster songs` : 'Trending Global Pop Hits songs';
  const q4 = `${artist1} acoustic indie fresh songs`;
  const q5 = 'Hans Zimmer Ludovico Einaudi ambient instrumental study focus songs';
  const q6 = 'Lo-Fi chill beats relax study songs';

  // Run all queries concurrently for ultra-fast response
  const [r1, r2, r3, r4, r5, r6] = await Promise.allSettled([
    searchTracks(q1, 1, 15, 'ytmusicapi', 'songs'),
    searchTracks(q2, 1, 15, 'ytmusicapi', 'songs'),
    searchTracks(q3, 1, 15, 'ytmusicapi', 'songs'),
    searchTracks(q4, 1, 15, 'ytmusicapi', 'songs'),
    searchTracks(q5, 1, 15, 'ytmusicapi', 'songs'),
    searchTracks(q6, 1, 15, 'ytmusicapi', 'songs'),
  ]);

  const mixes: Playlist[] = [];

  if (r1.status === 'fulfilled') {
    const clean1 = filterMusicTracks(r1.value.items);
    if (clean1.length > 0) {
      mixes.push({
        id: 'auto-mix-daily-1',
        name: 'Daily Mix 1',
        description: getArtistSummary(clean1, `${artist1} and similar music`),
        coverUrl: clean1[0]?.thumbnailUrl || clean1[1]?.thumbnailUrl,
        createdAt: new Date().toISOString(),
        isCustom: false,
        tracks: clean1,
      });
    }
  }

  if (r2.status === 'fulfilled') {
    const clean2 = filterMusicTracks(r2.value.items);
    if (clean2.length > 0) {
      mixes.push({
        id: 'auto-mix-daily-2',
        name: 'Daily Mix 2',
        description: getArtistSummary(clean2, `${artist2} and curated artists`),
        coverUrl: clean2[0]?.thumbnailUrl || clean2[1]?.thumbnailUrl,
        createdAt: new Date().toISOString(),
        isCustom: false,
        tracks: clean2,
      });
    }
  }

  if (r3.status === 'fulfilled') {
    const clean3 = filterMusicTracks(r3.value.items);
    if (clean3.length > 0) {
      mixes.push({
        id: 'auto-mix-regional',
        name: `${langLabel} Supermix`,
        description: getArtistSummary(clean3, `Top trending tracks in ${langLabel}`),
        coverUrl: clean3[0]?.thumbnailUrl || clean3[1]?.thumbnailUrl,
        createdAt: new Date().toISOString(),
        isCustom: false,
        tracks: clean3,
      });
    }
  }

  if (r4.status === 'fulfilled') {
    const clean4 = filterMusicTracks(r4.value.items);
    if (clean4.length > 0) {
      mixes.push({
        id: 'auto-mix-discover-weekly',
        name: 'Discover Weekly',
        description: 'Fresh music discoveries tuned to your personal taste',
        coverUrl: clean4[0]?.thumbnailUrl || clean4[1]?.thumbnailUrl,
        createdAt: new Date().toISOString(),
        isCustom: false,
        tracks: clean4,
      });
    }
  }

  if (r5.status === 'fulfilled') {
    const clean5 = filterMusicTracks(r5.value.items);
    if (clean5.length > 0) {
      mixes.push({
        id: 'auto-mix-focus',
        name: 'Deep Focus & Flow',
        description: 'Atmospheric textures and acoustic instrumentals to help you zone in',
        coverUrl:
          clean5[0]?.thumbnailUrl ||
          clean5[1]?.thumbnailUrl ||
          'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
        isCustom: false,
        tracks: clean5,
      });
    }
  }

  if (r6.status === 'fulfilled') {
    const clean6 = filterMusicTracks(r6.value.items);
    if (clean6.length > 0) {
      mixes.push({
        id: 'auto-mix-lofi',
        name: 'Midnight Lo-Fi Chill',
        description: 'Mellow beats and gentle vinyl rhythms for late night listening',
        coverUrl:
          clean6[0]?.thumbnailUrl ||
          clean6[1]?.thumbnailUrl ||
          'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
        isCustom: false,
        tracks: clean6,
      });
    }
  }

  if (mixes.length === 0) {
    return INITIAL_DEFAULT_AUTO_MIXES;
  }

  saveCachedAutoMixes(language, mixes);
  return mixes;
}
