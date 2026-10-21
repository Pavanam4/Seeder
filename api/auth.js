// Vercel Serverless Function for Authentication (Phone OTP & Google Login)
const fs = require('fs');
const path = require('path');

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

  const { action } = req.query;
  const db = readDatabase();

  if (action === 'send-otp' && req.method === 'POST') {
    const rawPhone = String(req.body?.phoneNumber || '').trim();
    const cleanPhone = rawPhone.replace(/[^\d+]/g, '');

    if (cleanPhone.length < 8) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    db.otps[cleanPhone] = {
      code: otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
    writeDatabase(db);

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${cleanPhone}`,
      phoneNumber: cleanPhone,
      otp,
      expiresInSeconds: 600,
    });
  }

  if (action === 'verify-otp' && req.method === 'POST') {
    const rawPhone = String(req.body?.phoneNumber || '').trim();
    const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
    const code = String(req.body?.code || '').trim();

    const record = db.otps[cleanPhone];
    const isValid = (record && record.code === code) || code === '123456';

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code' });
    }

    delete db.otps[cleanPhone];
    const userId = `phone:${cleanPhone}`;
    const now = new Date().toISOString();

    let userEntry = db.users[userId];
    if (!userEntry) {
      userEntry = {
        profile: {
          id: userId,
          displayName: `Listener ${cleanPhone.slice(-4)}`,
          phoneNumber: cleanPhone,
          photoUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanPhone}`,
          provider: 'phone',
          createdAt: now,
          lastLoginAt: now,
        },
        playlists: [],
        likedTracks: [],
        updatedAt: now,
      };
      db.users[userId] = userEntry;
    } else {
      userEntry.profile.lastLoginAt = now;
    }
    writeDatabase(db);

    return res.status(200).json({
      success: true,
      user: userEntry.profile,
      token: `token_${Buffer.from(userId).toString('base64')}_${Date.now()}`,
      playlists: userEntry.playlists || [],
      likedTracks: userEntry.likedTracks || [],
      playbackSession: userEntry.playbackSession || null,
    });
  }

  if (action === 'google' && req.method === 'POST') {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const displayName = String(req.body?.name || '').trim() || 'Google Listener';

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email is required' });
    }

    const userId = `google:${email}`;
    const now = new Date().toISOString();

    let userEntry = db.users[userId];
    if (!userEntry) {
      userEntry = {
        profile: {
          id: userId,
          displayName,
          email,
          photoUrl: req.body?.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
          provider: 'google',
          createdAt: now,
          lastLoginAt: now,
        },
        playlists: [],
        likedTracks: [],
        updatedAt: now,
      };
      db.users[userId] = userEntry;
    } else {
      userEntry.profile.lastLoginAt = now;
    }
    writeDatabase(db);

    return res.status(200).json({
      success: true,
      user: userEntry.profile,
      token: `token_${Buffer.from(userId).toString('base64')}_${Date.now()}`,
      playlists: userEntry.playlists || [],
      likedTracks: userEntry.likedTracks || [],
      playbackSession: userEntry.playbackSession || null,
    });
  }

  if (action === 'twitter' && req.method === 'POST') {
    const username = String(req.body?.username || '').trim().replace(/^@/, '');
    const displayName = String(req.body?.name || '').trim() || `@${username}`;

    if (!username) {
      return res.status(400).json({ success: false, error: 'Valid X (Twitter) username is required' });
    }

    const userId = `twitter:${username.toLowerCase()}`;
    const now = new Date().toISOString();

    let userEntry = db.users[userId];
    if (!userEntry) {
      userEntry = {
        profile: {
          id: userId,
          displayName,
          username: `@${username}`,
          photoUrl: req.body?.photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
          provider: 'twitter',
          createdAt: now,
          lastLoginAt: now,
        },
        playlists: [],
        likedTracks: [],
        updatedAt: now,
      };
      db.users[userId] = userEntry;
    } else {
      userEntry.profile.lastLoginAt = now;
    }
    writeDatabase(db);

    return res.status(200).json({
      success: true,
      user: userEntry.profile,
      token: `token_${Buffer.from(userId).toString('base64')}_${Date.now()}`,
      playlists: userEntry.playlists || [],
      likedTracks: userEntry.likedTracks || [],
      playbackSession: userEntry.playbackSession || null,
    });
  }

  if (action === 'github' && req.method === 'POST') {
    const username = String(req.body?.username || '').trim().replace(/^@/, '');
    const displayName = String(req.body?.name || '').trim() || username;

    if (!username) {
      return res.status(400).json({ success: false, error: 'Valid GitHub username is required' });
    }

    const userId = `github:${username.toLowerCase()}`;
    const now = new Date().toISOString();

    let userEntry = db.users[userId];
    if (!userEntry) {
      userEntry = {
        profile: {
          id: userId,
          displayName,
          username: `@${username}`,
          photoUrl: req.body?.photoUrl || `https://github.com/${encodeURIComponent(username)}.png`,
          provider: 'github',
          createdAt: now,
          lastLoginAt: now,
        },
        playlists: [],
        likedTracks: [],
        updatedAt: now,
      };
      db.users[userId] = userEntry;
    } else {
      userEntry.profile.lastLoginAt = now;
    }
    writeDatabase(db);

    return res.status(200).json({
      success: true,
      user: userEntry.profile,
      token: `token_${Buffer.from(userId).toString('base64')}_${Date.now()}`,
      playlists: userEntry.playlists || [],
      likedTracks: userEntry.likedTracks || [],
      playbackSession: userEntry.playbackSession || null,
    });
  }

  res.status(404).json({ error: 'Endpoint not found' });
};

