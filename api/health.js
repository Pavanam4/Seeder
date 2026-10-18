// Vercel Serverless Function for Health Check
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({
    status: 'healthy',
    service: 'MusicFetcher.VercelCloudEngine',
    provider: 'ytmusicapi',
    framework: 'Vercel Serverless Function',
    notice: 'Direct cloud music search and streaming engine active.',
  });
};
