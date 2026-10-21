// Vercel Serverless Function for User Playlist and Liked Tracks Cloud Synchronization
const fs = require('fs');

const dbFile = '/tmp/cloud_sync.json';

function readDatabase() {
  try {
    if (fs.existsSync(dbFile)) {
      return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    }
  } catch {}
  return { users: {}, otps: {} };
}

function writeDatabase(data) {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data));
  } catch {}
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const db = readDatabase();

  if (req.method === 'GET') {
    const userId = req.query?.userId;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId parameter' });
    }

    const userEntry = db.users[userId];
    if (!userEntry) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      user: userEntry.profile,
      playlists: userEntry.playlists || [],
      likedTracks: userEntry.likedTracks || [],
      playbackSession: userEntry.playbackSession || null,
      updatedAt: userEntry.updatedAt,
    });
  }

  if (req.method === 'POST') {
    const userId = req.body?.userId;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId parameter' });
    }

    let userEntry = db.users[userId];
    const now = new Date().toISOString();

    if (!userEntry) {
      userEntry = {
        profile: {
          id: userId,
          displayName: 'Listener',
          provider: userId.startsWith('google:') ? 'google' : 'phone',
          createdAt: now,
          lastLoginAt: now,
        },
        playlists: [],
        likedTracks: [],
        updatedAt: now,
      };
      db.users[userId] = userEntry;
    }

    if (Array.isArray(req.body?.playlists)) {
      userEntry.playlists = req.body.playlists;
    }
    if (Array.isArray(req.body?.likedTracks)) {
      userEntry.likedTracks = req.body.likedTracks;
    }
    if (req.body?.playbackSession) {
      userEntry.playbackSession = req.body.playbackSession;
    }
    userEntry.updatedAt = now;
    writeDatabase(db);

    return res.status(200).json({
      success: true,
      updatedAt: userEntry.updatedAt,
    });
  }

  res.status(404).json({ error: 'Method not supported' });
};
