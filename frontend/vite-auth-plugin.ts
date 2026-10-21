import type { Plugin, ViteDevServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

interface CloudDatabase {
  users: Record<string, {
    profile: {
      id: string;
      displayName: string;
      email?: string;
      phoneNumber?: string;
      photoUrl?: string;
      provider: 'google' | 'phone';
      createdAt: string;
      lastLoginAt: string;
    };
    playlists: any[];
    likedTracks: any[];
    playbackSession?: any;
    updatedAt: string;
  }>;
  otps: Record<string, {
    code: string;
    expiresAt: number;
    attempts: number;
  }>;
}

export function authSyncPlugin(): Plugin {
  const dbDir = path.resolve(process.cwd(), '../data');
  const dbFile = path.resolve(dbDir, 'cloud_sync.json');

  function readDatabase(): CloudDatabase {
    try {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      if (!fs.existsSync(dbFile)) {
        const initData: CloudDatabase = { users: {}, otps: {} };
        fs.writeFileSync(dbFile, JSON.stringify(initData, null, 2), 'utf-8');
        return initData;
      }
      const raw = fs.readFileSync(dbFile, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('[CloudSync] Error reading database:', err);
      return { users: {}, otps: {} };
    }
  }

  function writeDatabase(data: CloudDatabase): void {
    try {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[CloudSync] Error writing database:', err);
    }
  }

  function parseJsonBody(req: any): Promise<any> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });
  }

  function sendJson(res: any, status: number, data: any) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end(JSON.stringify(data));
  }

  return {
    name: 'seeder-auth-sync-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // Handle CORS Preflight
        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.end();
          return;
        }

        // 1. Send OTP for Phone Number
        if (url.startsWith('/api/auth/phone/send-otp') && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const rawPhone = String(body.phoneNumber || '').trim();
          const cleanPhone = rawPhone.replace(/[^\d+]/g, '');

          if (cleanPhone.length < 8) {
            sendJson(res, 400, {
              success: false,
              error: 'Invalid phone number format. Please provide a valid number with country code.',
            });
            return;
          }

          // Generate 6-digit OTP (e.g. 482915)
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

          const db = readDatabase();
          db.otps[cleanPhone] = {
            code: otp,
            expiresAt,
            attempts: 0,
          };
          writeDatabase(db);

          console.log(`\n======================================================`);
          console.log(`[SMS GATEWAY SIMULATION] To: ${cleanPhone}`);
          console.log(`[SMS GATEWAY SIMULATION] Verification Code: ${otp}`);
          console.log(`[SMS GATEWAY SIMULATION] Valid for 10 minutes`);
          console.log(`======================================================\n`);

          sendJson(res, 200, {
            success: true,
            message: `Verification code sent to ${cleanPhone}`,
            phoneNumber: cleanPhone,
            otp, // Returned in dev/local mode so user can auto-fill or see code immediately
            expiresInSeconds: 600,
          });
          return;
        }

        // 2. Verify OTP for Phone Number
        if (url.startsWith('/api/auth/phone/verify-otp') && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const rawPhone = String(body.phoneNumber || '').trim();
          const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
          const code = String(body.code || '').trim();

          const db = readDatabase();
          const record = db.otps[cleanPhone];

          // Validate OTP (also accept demo fallback '123456' for convenience)
          const isValid =
            (record && record.code === code && Date.now() <= record.expiresAt) ||
            code === '123456' ||
            (record && code === record.code);

          if (!isValid) {
            sendJson(res, 400, {
              success: false,
              error: 'Invalid or expired verification code. Please request a new code.',
            });
            return;
          }

          // Delete consumed OTP
          delete db.otps[cleanPhone];

          const userId = `phone:${cleanPhone}`;
          const now = new Date().toISOString();
          const lastDigits = cleanPhone.slice(-4);

          let userEntry = db.users[userId];
          if (!userEntry) {
            // First time registration: create cloud user profile
            userEntry = {
              profile: {
                id: userId,
                displayName: `Listener ${lastDigits}`,
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

          sendJson(res, 200, {
            success: true,
            user: userEntry.profile,
            token: `token_${Buffer.from(userId).toString('base64')}_${Date.now()}`,
            playlists: userEntry.playlists || [],
            likedTracks: userEntry.likedTracks || [],
            playbackSession: userEntry.playbackSession || null,
          });
          return;
        }

        // 3. Google Sign-In
        if (url.startsWith('/api/auth/google') && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const email = String(body.email || '').trim().toLowerCase();
          const displayName = String(body.name || body.displayName || '').trim() || 'Google Listener';

          if (!email || !email.includes('@')) {
            sendJson(res, 400, {
              success: false,
              error: 'A valid email address is required for Google Sign-In.',
            });
            return;
          }

          const userId = `google:${email}`;
          const now = new Date().toISOString();
          const db = readDatabase();

          let userEntry = db.users[userId];
          if (!userEntry) {
            userEntry = {
              profile: {
                id: userId,
                displayName,
                email,
                photoUrl:
                  body.photoUrl ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                    displayName
                  )}&backgroundColor=f59e0b,10b981,3b82f6&fontWeight=bold`,
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
            if (displayName) userEntry.profile.displayName = displayName;
            if (body.photoUrl) userEntry.profile.photoUrl = body.photoUrl;
          }

          writeDatabase(db);

          sendJson(res, 200, {
            success: true,
            user: userEntry.profile,
            token: `token_${Buffer.from(userId).toString('base64')}_${Date.now()}`,
            playlists: userEntry.playlists || [],
            likedTracks: userEntry.likedTracks || [],
            playbackSession: userEntry.playbackSession || null,
          });
          return;
        }

        // 4. Fetch Synced Cloud Data for User
        if (url.startsWith('/api/user/sync') && req.method === 'GET') {
          const parsedUrl = new URL(url, 'http://localhost');
          const userId = parsedUrl.searchParams.get('userId');

          if (!userId) {
            sendJson(res, 400, { success: false, error: 'Missing userId parameter' });
            return;
          }

          const db = readDatabase();
          const userEntry = db.users[userId];

          if (!userEntry) {
            sendJson(res, 404, {
              success: false,
              error: 'User account not found on cloud server',
            });
            return;
          }

          sendJson(res, 200, {
            success: true,
            user: userEntry.profile,
            playlists: userEntry.playlists || [],
            likedTracks: userEntry.likedTracks || [],
            playbackSession: userEntry.playbackSession || null,
            updatedAt: userEntry.updatedAt,
          });
          return;
        }

        // 5. Push Updated Playlists / Liked Tracks to Cloud
        if (url.startsWith('/api/user/sync') && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const userId = String(body.userId || '').trim();

          if (!userId) {
            sendJson(res, 400, { success: false, error: 'Missing userId parameter' });
            return;
          }

          const db = readDatabase();
          let userEntry = db.users[userId];

          if (!userEntry) {
            // Auto-create user entry if missing
            const now = new Date().toISOString();
            userEntry = {
              profile: {
                id: userId,
                displayName: userId.startsWith('phone:') ? `Listener ${userId.slice(-4)}` : 'Listener',
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

          if (Array.isArray(body.playlists)) {
            userEntry.playlists = body.playlists;
          }

          if (Array.isArray(body.likedTracks)) {
            userEntry.likedTracks = body.likedTracks;
          }

          if (body.playbackSession) {
            userEntry.playbackSession = body.playbackSession;
          }

          userEntry.updatedAt = new Date().toISOString();
          writeDatabase(db);

          sendJson(res, 200, {
            success: true,
            updatedAt: userEntry.updatedAt,
            playlistCount: userEntry.playlists.length,
            likedTrackCount: userEntry.likedTracks.length,
          });
          return;
        }

        // Forward any other requests (like /api/search)
        next();
      });
    },
  };
}
