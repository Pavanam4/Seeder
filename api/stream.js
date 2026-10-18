// Vercel Serverless Function to extract direct audio streams for mobile background playback
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = (req.query.id || '').trim();
  const shouldRedirect = req.query.redirect === 'true' || req.query.redirect === '1';

  if (!videoId || videoId.length !== 11) {
    return res.status(400).json({ error: 'Valid 11-character video ID is required.' });
  }

  const invidiousHosts = [
    'https://invidious.jing.rocks',
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://iv.ggtyler.dev',
  ];

  // Try Invidious instances to find direct audio streams
  for (const host of invidiousHosts) {
    try {
      const resp = await fetch(`${host}/api/v1/videos/${videoId}`, {
        signal: AbortSignal.timeout(3500),
      });

      if (resp.ok) {
        const data = await resp.json();
        // Look for audio formats in adaptiveFormats
        const audioFormat =
          (data.adaptiveFormats || []).find((f) => f.type && f.type.startsWith('audio/')) ||
          (data.formatStreams || []).find((f) => f.type && f.type.startsWith('audio/'));

        if (audioFormat && audioFormat.url) {
          if (shouldRedirect) {
            return res.redirect(302, audioFormat.url);
          }
          return res.status(200).json({
            success: true,
            id: videoId,
            streamUrl: audioFormat.url,
            mimeType: audioFormat.type || 'audio/mp4',
            bitrate: audioFormat.bitrate || 128000,
          });
        }
      }
    } catch (e) {
      // try next host
    }
  }

  // Fallback to Piped stream API
  const pipedHosts = [
    'https://api.piped.private.coffee',
    'https://pipedapi.tokhmi.xyz',
  ];

  for (const host of pipedHosts) {
    try {
      const resp = await fetch(`${host}/streams/${videoId}`, {
        signal: AbortSignal.timeout(3500),
      });

      if (resp.ok) {
        const data = await resp.json();
        const audioStream =
          (data.audioStreams || []).find((s) => s.mimeType && s.mimeType.startsWith('audio/')) ||
          (data.audioStreams || [])[0];

        if (audioStream && audioStream.url) {
          if (shouldRedirect) {
            return res.redirect(302, audioStream.url);
          }
          return res.status(200).json({
            success: true,
            id: videoId,
            streamUrl: audioStream.url,
            mimeType: audioStream.mimeType || 'audio/mp4',
            bitrate: audioStream.bitrate || 128000,
          });
        }
      }
    } catch (e) {
      // try next host
    }
  }

  return res.status(404).json({
    error: 'Audio stream could not be extracted for this video ID.',
    id: videoId,
  });
};
