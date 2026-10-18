// Vercel Serverless Function for Provider Information
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json([
    {
      id: 'ytmusicapi',
      name: 'ytmusicapi (YouTube Music Cloud Engine)',
      description: 'High-fidelity search using YouTube Music catalog without API keys.',
      isDefault: true,
      requiresExternalInstance: false,
    },
    {
      id: 'youtubeexplode',
      name: 'YouTube Direct Engine',
      description: 'Direct scraper engine extracting video search metadata from YouTube.',
      isDefault: false,
      requiresExternalInstance: false,
    },
    {
      id: 'invidious',
      name: 'Invidious (Alternative Engine)',
      description: 'Open-source front-end proxy API for YouTube with configurable public instances.',
      isDefault: false,
      requiresExternalInstance: true,
    },
  ]);
};
