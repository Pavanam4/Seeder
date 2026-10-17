export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface SyncedLyricsResult {
  lines: LyricLine[];
  source: 'lrclib' | 'synced-generated';
  hasTimestamps: boolean;
}

/**
 * Clean messy track title from YouTube tags like (Official Music Video), [HD], feat. etc.
 */
export function cleanTrackTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\s*[\(\[](?:Official\s*(?:Music\s*)?Video|Audio|Lyric\s*Video|HD|4K|Visualizer|Remastered|From\s+"[^"]+")[\)\]]/gi, '')
    .replace(/\s*\|\s*Official\s*(?:Music\s*)?Video.*/gi, '')
    .replace(/\s*\|\s*.*$/gi, '') // remove trailing channel/pipe metadata
    .replace(/\s*-\s*Official\s*(?:Music\s*)?Video.*/gi, '')
    .trim();
}

/**
 * Parse standard LRC format text: "[01:23.45] line text" into LyricLine array
 */
export function parseLrcText(lrc: string): LyricLine[] {
  if (!lrc) return [];
  const lines = lrc.split('\n');
  const result: LyricLine[] = [];

  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Reset regex index
    timeRegex.lastIndex = 0;
    const matches = Array.from(trimmed.matchAll(timeRegex));
    if (matches.length === 0) continue;

    // Extract text after all timestamp brackets
    const text = trimmed.replace(timeRegex, '').trim();
    if (!text) continue;

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millis = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
      const totalSeconds = minutes * 60 + seconds + millis / 1000;

      result.push({
        time: totalSeconds,
        text,
      });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/**
 * Fallback synchronized lyric generator for tracks without public LRC entries
 */
function generateFallbackLyrics(title: string, artist: string, durationSec: number): LyricLine[] {
  const dur = durationSec > 30 ? durationSec : 180;
  const lines: LyricLine[] = [
    { time: 2, text: `♪ Now Playing: ${title} ♪` },
    { time: 8, text: `Performed by ${artist || 'Featured Artist'}` },
    { time: 18, text: '♪ Instrumental Prelude ♪' },
  ];

  // Distribute rhythmic lyrical markers throughout track duration
  const step = Math.max(12, Math.floor((dur - 30) / 10));
  let cur = 28;
  let counter = 1;

  while (cur < dur - 15) {
    const phrases = [
      '♪ Catch the rhythm and feel the melody ♪',
      '♪ Golden harmonies drifting in the soundscape ♪',
      '♪ Bassline echoing through the night ♪',
      '♪ High-fidelity audio flowing effortlessly ♪',
      '♪ Sync with the pulse of the beat ♪',
      '♪ Soulful resonance in motion ♪',
    ];
    lines.push({
      time: cur,
      text: phrases[(counter - 1) % phrases.length],
    });
    cur += step;
    counter++;
  }

  lines.push({ time: Math.max(dur - 10, cur), text: '♪ Outro & Fading Harmonies ♪' });
  return lines;
}

/**
 * Fetch synchronized lyrics from LRCLIB with title cleaning and intelligent fallback
 */
export async function fetchSyncedLyrics(
  title: string,
  artist: string,
  durationSec: number = 0
): Promise<SyncedLyricsResult> {
  const cleanedTitle = cleanTrackTitle(title);
  const cleanedArtist = (artist || '').split(/[,&]/)[0].trim();

  // Try direct LRCLIB lookup
  try {
    const directUrl = new URL('https://lrclib.net/api/get');
    directUrl.searchParams.set('track_name', cleanedTitle);
    if (cleanedArtist) directUrl.searchParams.set('artist_name', cleanedArtist);
    if (durationSec > 0) directUrl.searchParams.set('duration', Math.round(durationSec).toString());

    const directRes = await fetch(directUrl.toString(), {
      headers: {
        'User-Agent': 'SeederPlayDesktop/2.0 (Windows)',
      },
    });

    if (directRes.ok) {
      const data = await directRes.json();
      if (data.syncedLyrics) {
        const parsed = parseLrcText(data.syncedLyrics);
        if (parsed.length > 0) {
          return { lines: parsed, source: 'lrclib', hasTimestamps: true };
        }
      }
    }
  } catch (err) {
    console.warn('Direct LRCLIB lookup error:', err);
  }

  // Fallback to LRCLIB search
  try {
    const searchUrl = new URL('https://lrclib.net/api/search');
    searchUrl.searchParams.set('q', `${cleanedTitle} ${cleanedArtist}`.trim());

    const searchRes = await fetch(searchUrl.toString(), {
      headers: {
        'User-Agent': 'SeederPlayDesktop/2.0 (Windows)',
      },
    });

    if (searchRes.ok) {
      const list = await searchRes.json();
      if (Array.isArray(list) && list.length > 0) {
        // Find first item with syncedLyrics
        const candidate = list.find((item) => item.syncedLyrics);
        if (candidate && candidate.syncedLyrics) {
          const parsed = parseLrcText(candidate.syncedLyrics);
          if (parsed.length > 0) {
            return { lines: parsed, source: 'lrclib', hasTimestamps: true };
          }
        }
      }
    }
  } catch (err) {
    console.warn('LRCLIB search error:', err);
  }

  // Graceful fallback with rhythmic timestamps
  return {
    lines: generateFallbackLyrics(title, artist, durationSec),
    source: 'synced-generated',
    hasTimestamps: true,
  };
}
