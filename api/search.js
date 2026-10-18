// Vercel Serverless Function for Music Search (YouTube & YouTube Music Cloud Engine)
// Provides zero-dependency, serverless music search for Vercel deployments.

module.exports = async (req, res) => {
  // Set CORS headers so frontend can call from anywhere
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  const query = (req.query.q || '').trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const filter = (req.query.filter || '').trim().toLowerCase();

  if (!query) {
    return res.status(400).json({ error: 'Search query parameter "q" is required.' });
  }

  // Adjust search query based on category/filter
  let searchQuery = query;
  if (filter === 'new_releases' || query.toLowerCase() === 'new releases') {
    searchQuery = 'new music releases official audio';
  } else if (filter === 'songs' && !query.toLowerCase().includes('song')) {
    searchQuery = `${query} official audio`;
  }

  let items = [];

  // Strategy 1: YouTube Music & YouTube Web Search via internal Innertube / youtubei API
  try {
    const ytRes = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'X-YouTube-Client-Name': '1',
        'X-YouTube-Client-Version': '2.20240101.01.00',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
        query: searchQuery,
      }),
    });

    if (ytRes.ok) {
      const data = await ytRes.json();
      const sections =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
          ?.contents || [];

      for (const section of sections) {
        const contents = section?.itemSectionRenderer?.contents || [];
        for (const item of contents) {
          const v = item?.videoRenderer;
          if (!v || !v.videoId || v.videoId.length !== 11) continue;

          const title =
            v.title?.runs?.[0]?.text || v.title?.simpleText || 'Untitled Track';
          const artist =
            v.ownerText?.runs?.[0]?.text ||
            v.shortBylineText?.runs?.[0]?.text ||
            'Unknown Artist';
          const durationStr = v.lengthText?.simpleText || '3:30';

          // Parse duration string into seconds
          const parts = durationStr.split(':').map((p) => parseInt(p, 10) || 0);
          let durationSeconds = 180;
          if (parts.length === 2) {
            durationSeconds = parts[0] * 60 + parts[1];
          } else if (parts.length === 3) {
            durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
          }

          const thumbs = v.thumbnail?.thumbnails || [];
          const bestThumb = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : null;
          const thumbnailUrl =
            bestThumb && bestThumb.startsWith('//')
              ? `https:${bestThumb}`
              : bestThumb || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

          items.push({
            id: v.videoId,
            title,
            artist,
            album: 'Single / Official Audio',
            duration: durationStr,
            durationSeconds,
            thumbnailUrl,
            youtubeUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
            isEmbeddableCandidate: true,
            source: 'ytmusicapi',
          });

          if (items.length >= limit * page + 5) break;
        }
        if (items.length >= limit * page + 5) break;
      }
    }
  } catch (ytErr) {
    console.warn('YouTube direct Innertube fetch failed:', ytErr.message);
  }

  // Strategy 2: Invidious Public Instance Rotation (Server-side, no CORS restriction)
  if (items.length === 0) {
    const invidiousHosts = [
      'https://inv.nadeko.net',
      'https://invidious.jing.rocks',
      'https://iv.ggtyler.dev',
      'https://invidious.nerdvpn.de',
    ];

    for (const host of invidiousHosts) {
      try {
        const invRes = await fetch(
          `${host}/api/v1/search?q=${encodeURIComponent(searchQuery)}&type=video`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (invRes.ok) {
          const data = await invRes.json();
          if (Array.isArray(data) && data.length > 0) {
            for (const v of data) {
              if (!v.videoId || v.videoId.length !== 11) continue;
              const secs = v.lengthSeconds || 180;
              const mins = Math.floor(secs / 60);
              const remSecs = secs % 60;
              const duration = `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
              const thumbs = v.videoThumbnails || [];
              const thumbnailUrl =
                thumbs.length > 0
                  ? thumbs[0].url
                  : `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

              items.push({
                id: v.videoId,
                title: v.title || 'Untitled Track',
                artist: v.author || 'Unknown Artist',
                album: 'Single',
                duration,
                durationSeconds: secs,
                thumbnailUrl,
                youtubeUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
                isEmbeddableCandidate: true,
                source: 'invidious-cloud',
              });
              if (items.length >= limit * page + 5) break;
            }
            if (items.length > 0) break;
          }
        }
      } catch (invErr) {
        // try next instance
      }
    }
  }

  // Strategy 3: iTunes Catalog + YouTube Auto-Match Fallback
  if (items.length === 0) {
    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit * page + 5}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (itunesRes.ok) {
        const itunesData = await itunesRes.json();
        if (itunesData && Array.isArray(itunesData.results) && itunesData.results.length > 0) {
          for (const r of itunesData.results) {
            const totalSecs = Math.round((r.trackTimeMillis || 180000) / 1000);
            const mins = Math.floor(totalSecs / 60);
            const remSecs = totalSecs % 60;
            const art = (r.artworkUrl100 || '').replace('100x100bb', '600x600bb');

            items.push({
              id: String(r.trackId),
              title: r.trackName || 'Untitled Track',
              artist: r.artistName || 'Unknown Artist',
              album: r.collectionName || 'Single',
              duration: `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`,
              durationSeconds: totalSecs,
              thumbnailUrl: art || `https://i.ytimg.com/vi/${r.trackId}/hqdefault.jpg`,
              youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
                `${r.trackName} ${r.artistName}`
              )}`,
              isEmbeddableCandidate: false, // will trigger dynamic 11-char video ID resolution
              source: 'itunes-cloud',
            });
          }
        }
      }
    } catch (itunesErr) {
      console.warn('iTunes fallback search failed:', itunesErr.message);
    }
  }

  // Deduplicate by ID
  const seen = new Set();
  const uniqueItems = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      uniqueItems.push(item);
    }
  }

  // Pagination slice
  const skip = (page - 1) * limit;
  const pagedItems = uniqueItems.slice(skip, skip + limit);
  const elapsedMs = Date.now() - startTime;

  return res.status(200).json({
    provider: 'ytmusicapi (YouTube Cloud Engine)',
    query,
    page,
    limit,
    durationMs: elapsedMs,
    totalReturned: pagedItems.length,
    hasMore: uniqueItems.length > skip + limit,
    items: pagedItems,
    statusCode: 200,
  });
};
