import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut as fbSignOut,
  onAuthStateChanged,
  type Auth,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Playlist, MusicTrack, PlaybackSession, UserProfile } from '../types';

export type { ConfirmationResult };

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const FIREBASE_CONFIG_STORAGE_KEY = 'seeder_firebase_config_v1';
const DEVICE_ID_KEY = 'seeder_device_client_id';

/**
 * Generate or retrieve persistent local device ID to differentiate devices during sync
 */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `dev_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'dev_unknown';
  }
}

/**
 * Get device friendly name (e.g. "Windows Chrome", "Mac Safari", "Mobile Device")
 */
export function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Desktop Browser';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android Device';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS Device';
  if (/Macintosh/i.test(ua)) return 'macOS App';
  if (/Windows/i.test(ua)) return 'Windows Desktop';
  return 'Web Client';
}

/**
 * Load Firebase configuration from environment variables or custom localStorage override
 */
export function getFirebaseConfig(): FirebaseClientConfig | null {
  try {
    // 1. Check custom saved configuration in browser storage
    const saved = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.projectId && parsed.appId) {
        return parsed;
      }
    }
  } catch {}

  // 2. Check Vite environment variables
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (apiKey && projectId && appId) {
    return {
      apiKey,
      authDomain: authDomain || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
      messagingSenderId: messagingSenderId || '127738399876',
      appId,
    };
  }

  // 3. Default to configured PlayMusic Firebase app
  return {
    apiKey: 'AIzaSyBiZwzcE6V5HV_GZXX5VU_Vgx4E0kIKnZc',
    authDomain: 'playmusic-1bcca.firebaseapp.com',
    projectId: 'playmusic-1bcca',
    storageBucket: 'playmusic-1bcca.firebasestorage.app',
    messagingSenderId: '127738399876',
    appId: '1:127738399876:web:07f28a679f7d3af82486d1',
  };
}

export function saveFirebaseConfig(config: FirebaseClientConfig): void {
  localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  // Reload page to re-initialize Firebase instances cleanly
  window.location.reload();
}

export function clearFirebaseConfig(): void {
  localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
  window.location.reload();
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig() !== null;
}

// Singletons
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;

export function getFirebaseServices(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
} {
  const config = getFirebaseConfig();
  if (!config) {
    return { app: null, auth: null, db: null };
  }

  if (!firebaseApp) {
    const existing = getApps();
    if (existing.length > 0) {
      firebaseApp = existing[0];
    } else {
      firebaseApp = initializeApp(config);
    }
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);
  }

  return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
}

/**
 * Sanitize object for Firestore to avoid "Unsupported field value: undefined" errors
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) return null as any;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return (obj as any[]).map(sanitizeForFirestore) as any;
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj as any)) {
    if (val !== undefined) {
      clean[key] = sanitizeForFirestore(val);
    }
  }
  return clean as T;
}

/**
 * Convert Firebase User into Seeder UserProfile
 */
export function formatFirebaseUser(user: User): UserProfile {
  const isGoogle = user.providerData.some((p) => p.providerId === 'google.com');
  const isGithub = user.providerData.some((p) => p.providerId === 'github.com');
  const isTwitter = user.providerData.some((p) => p.providerId === 'twitter.com');
  const isPhone = user.providerData.some((p) => p.providerId === 'phone') || !!user.phoneNumber;

  const profile: UserProfile = {
    id: user.uid,
    displayName: user.displayName || (user.phoneNumber ? `Listener ${user.phoneNumber.slice(-4)}` : 'Listener'),
    photoUrl: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || user.uid)}`,
    provider: isGithub ? 'github' : isTwitter ? 'twitter' : isGoogle ? 'google' : isPhone ? 'phone' : 'guest',
    createdAt: user.metadata.creationTime || new Date().toISOString(),
  };

  if (user.email) profile.email = user.email;
  if (user.phoneNumber) profile.phoneNumber = user.phoneNumber;
  const screenName = (user as any)?.reloadUserInfo?.screenName;
  if (screenName) {
    profile.username = `@${screenName}`;
  } else if (user.displayName) {
    profile.username = `@${user.displayName.toLowerCase().replace(/\s+/g, '_')}`;
  }

  return profile;
}

/**
 * Safe Promise wrapper with timeout so Firestore calls NEVER hang indefinitely
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 2500, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

/**
 * Real GitHub Sign-In with Firebase
 */
export async function signInWithGithubFirebase(): Promise<{
  success: boolean;
  user?: UserProfile;
  error?: string;
}> {
  const { auth, db } = getFirebaseServices();
  if (!auth) {
    return { success: false, error: 'Firebase is not yet configured. Please set your Firebase credentials.' };
  }

  try {
    const provider = new GithubAuthProvider();
    provider.addScope('read:user');
    provider.addScope('user:email');
    const cred = await signInWithPopup(auth, provider);
    const profile = formatFirebaseUser(cred.user);

    // Initialize document in Firestore non-blocking in background
    if (db) {
      const userDocRef = doc(db, 'users', cred.user.uid);
      withTimeout(
        getDoc(userDocRef).then(async (snap) => {
          if (!snap.exists()) {
            await setDoc(userDocRef, {
              profile: sanitizeForFirestore(profile),
              playlists: [],
              likedTracks: [],
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
            });
          } else {
            await setDoc(userDocRef, { lastLoginAt: serverTimestamp(), profile: sanitizeForFirestore(profile) }, { merge: true });
          }
        }),
        2500,
        null
      ).catch((err) => console.warn('[Firestore] Non-blocking profile init:', err));
    }

    return { success: true, user: profile };
  } catch (err: any) {
    console.error('[Firebase Auth] GitHub Sign-In Error:', err);
    if (err.code === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Sign-in window closed before completion.' };
    }
    if (err.code === 'auth/unauthorized-domain') {
      return {
        success: false,
        error: 'Authorized domain error: Add "localhost" to your Firebase Console -> Authentication -> Settings -> Authorized Domains.',
      };
    }
    return { success: false, error: err.message || 'GitHub Sign-In failed.' };
  }
}

/**
 * Real Google Sign-In with Firebase
 */
export async function signInWithGoogleFirebase(): Promise<{
  success: boolean;
  user?: UserProfile;
  error?: string;
}> {
  const { auth, db } = getFirebaseServices();
  if (!auth) {
    return { success: false, error: 'Firebase is not yet configured. Please set your Firebase credentials.' };
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    const profile = formatFirebaseUser(cred.user);

    // Initialize document in Firestore non-blocking in background
    if (db) {
      const userDocRef = doc(db, 'users', cred.user.uid);
      withTimeout(
        getDoc(userDocRef).then(async (snap) => {
          if (!snap.exists()) {
            await setDoc(userDocRef, {
              profile: sanitizeForFirestore(profile),
              playlists: [],
              likedTracks: [],
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
            });
          } else {
            await setDoc(userDocRef, { lastLoginAt: serverTimestamp(), profile: sanitizeForFirestore(profile) }, { merge: true });
          }
        }),
        2500,
        null
      ).catch((err) => console.warn('[Firestore] Non-blocking profile init:', err));
    }

    return { success: true, user: profile };
  } catch (err: any) {
    console.error('[Firebase Auth] Google Sign-In Error:', err);
    if (err.code === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Sign-in window closed before completion.' };
    }
    if (err.code === 'auth/unauthorized-domain') {
      return {
        success: false,
        error: 'Authorized domain error: Add "localhost" to your Firebase Console -> Authentication -> Settings -> Authorized Domains.',
      };
    }
    return { success: false, error: err.message || 'Google Sign-In failed.' };
  }
}

/**
 * Real X (Twitter) Sign-In with Firebase
 */
export async function signInWithTwitterFirebase(): Promise<{
  success: boolean;
  user?: UserProfile;
  error?: string;
}> {
  const { auth, db } = getFirebaseServices();
  if (!auth) {
    return { success: false, error: 'Firebase is not yet configured. Please set your Firebase credentials.' };
  }

  try {
    const provider = new TwitterAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const profile = formatFirebaseUser(cred.user);

    // Initialize document in Firestore non-blocking in background
    if (db) {
      const userDocRef = doc(db, 'users', cred.user.uid);
      withTimeout(
        getDoc(userDocRef).then(async (snap) => {
          if (!snap.exists()) {
            await setDoc(userDocRef, {
              profile: sanitizeForFirestore(profile),
              playlists: [],
              likedTracks: [],
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
            });
          } else {
            await setDoc(userDocRef, { lastLoginAt: serverTimestamp(), profile: sanitizeForFirestore(profile) }, { merge: true });
          }
        }),
        2500,
        null
      ).catch((err) => console.warn('[Firestore] Non-blocking profile init:', err));
    }

    return { success: true, user: profile };
  } catch (err: any) {
    console.error('[Firebase Auth] X (Twitter) Sign-In Error:', err);
    if (err.code === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Sign-in window closed before completion.' };
    }
    if (err.code === 'auth/unauthorized-domain') {
      return {
        success: false,
        error: 'Authorized domain error: Add "localhost" to your Firebase Console -> Authentication -> Settings -> Authorized Domains.',
      };
    }
    return { success: false, error: err.message || 'X (Twitter) Sign-In failed.' };
  }
}

/**
 * Setup Invisible or Visible reCAPTCHA Verifier for Phone Auth
 */
let activeRecaptchaVerifier: RecaptchaVerifier | null = null;

export function setupPhoneRecaptcha(containerId: string): RecaptchaVerifier | null {
  const { auth } = getFirebaseServices();
  if (!auth) return null;

  try {
    if (activeRecaptchaVerifier) {
      activeRecaptchaVerifier.clear();
      activeRecaptchaVerifier = null;
    }
    activeRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved - will allow signInWithPhoneNumber
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expired. Resetting verifier.');
      },
    });
    return activeRecaptchaVerifier;
  } catch (err) {
    console.error('[Firebase Auth] Error setting up reCAPTCHA:', err);
    return null;
  }
}

/**
 * Send Real SMS Verification Code using Firebase Phone Auth
 */
export async function sendPhoneOtpFirebase(
  phoneNumber: string,
  containerId: string = 'recaptcha-container'
): Promise<{
  success: boolean;
  confirmationResult?: ConfirmationResult;
  error?: string;
}> {
  const { auth } = getFirebaseServices();
  if (!auth) {
    return { success: false, error: 'Firebase is not yet configured.' };
  }

  try {
    const verifier = setupPhoneRecaptcha(containerId);
    if (!verifier) {
      return { success: false, error: 'Failed to initialize phone verification security check.' };
    }

    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    return { success: true, confirmationResult };
  } catch (err: any) {
    console.error('[Firebase Auth] Phone OTP Send Error:', err);
    if (activeRecaptchaVerifier) {
      activeRecaptchaVerifier.clear();
      activeRecaptchaVerifier = null;
    }
    if (err.code === 'auth/invalid-phone-number') {
      return { success: false, error: 'The provided phone number is invalid. Ensure country code is included (e.g. +91XXXXXXXXXX).' };
    }
    if (err.code === 'auth/quota-exceeded') {
      return { success: false, error: 'SMS quota exceeded for today. Please try again later or use Google Sign-In.' };
    }
    return { success: false, error: err.message || 'Could not send SMS verification code.' };
  }
}

/**
 * Verify SMS OTP and complete Phone Authentication
 */
export async function verifyPhoneOtpFirebase(
  confirmationResult: ConfirmationResult,
  otpCode: string
): Promise<{
  success: boolean;
  user?: UserProfile;
  error?: string;
}> {
  const { db } = getFirebaseServices();
  try {
    const cred = await confirmationResult.confirm(otpCode);
    const profile = formatFirebaseUser(cred.user);

    if (db) {
      const userDocRef = doc(db, 'users', cred.user.uid);
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        await setDoc(userDocRef, {
          profile,
          playlists: [],
          likedTracks: [],
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        });
      } else {
        await setDoc(userDocRef, { lastLoginAt: serverTimestamp(), profile }, { merge: true });
      }
    }

    return { success: true, user: profile };
  } catch (err: any) {
    console.error('[Firebase Auth] Phone Verification Error:', err);
    if (err.code === 'auth/invalid-verification-code') {
      return { success: false, error: 'Invalid verification code. Please check the SMS and re-enter.' };
    }
    if (err.code === 'auth/code-expired') {
      return { success: false, error: 'Verification code has expired. Please request a new code.' };
    }
    return { success: false, error: err.message || 'Verification failed.' };
  }
}

/**
 * Sign out of Firebase
 */
export async function signOutFirebase(): Promise<void> {
  const { auth } = getFirebaseServices();
  if (auth) {
    await fbSignOut(auth);
  }
}

/**
 * Listen to Firebase Auth state changes
 */
export function onAuthStateSubscription(
  callback: (user: UserProfile | null) => void
): Unsubscribe | null {
  const { auth } = getFirebaseServices();
  if (!auth) return null;

  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback(formatFirebaseUser(user));
    } else {
      callback(null);
    }
  });
}

/* ==========================================================================
   REAL-TIME CLOUD FIRESTORE SYNCHRONIZATION
   (LIKES, PLAYLISTS, AND CONTINUOUS PLAYBACK ACROSS ALL DEVICES)
   ========================================================================== */

export interface CloudUserData {
  profile?: UserProfile;
  playlists: Playlist[];
  likedTracks: MusicTrack[];
  playbackSession?: PlaybackSession | null;
  updatedAt?: any;
}

/**
 * Push full library (playlists and liked tracks) to Cloud Firestore
 */
export async function syncLibraryToFirestore(
  uid: string,
  playlists: Playlist[],
  likedTracks: MusicTrack[]
): Promise<boolean> {
  const { db } = getFirebaseServices();
  if (!db || !uid) return false;

  try {
    const userDocRef = doc(db, 'users', uid);
    await withTimeout(
      setDoc(
        userDocRef,
        {
          playlists: sanitizeForFirestore(playlists),
          likedTracks: sanitizeForFirestore(likedTracks),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
      2000,
      undefined
    );
    return true;
  } catch (err) {
    console.warn('[Firestore Sync] Failed to sync library:', err);
    return false;
  }
}

/**
 * Push Continuous Playback Session to Cloud Firestore
 * Allows another device (phone, laptop, second browser) to pick up playback seamlessly
 */
export async function syncPlaybackSessionToFirestore(
  uid: string,
  session: PlaybackSession
): Promise<boolean> {
  const { db } = getFirebaseServices();
  if (!db || !uid || !session?.track?.id) return false;

  try {
    const userDocRef = doc(db, 'users', uid);
    const enrichedSession = {
      ...session,
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
      savedAt: Date.now(),
    };

    await withTimeout(
      setDoc(
        userDocRef,
        {
          playbackSession: sanitizeForFirestore(enrichedSession),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
      2000,
      undefined
    );
    return true;
  } catch (err) {
    console.warn('[Firestore Sync] Failed to sync playback session:', err);
    return false;
  }
}

/**
 * Fetch one-time user data from Firestore
 */
export async function fetchUserDataFromFirestore(uid: string): Promise<CloudUserData | null> {
  const { db } = getFirebaseServices();
  if (!db || !uid) return null;

  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await withTimeout(getDoc(userDocRef), 2000, null);
    if (!snap || !snap.exists()) return null;

    const data = snap.data();
    return {
      profile: data.profile,
      playlists: Array.isArray(data.playlists) ? data.playlists : [],
      likedTracks: Array.isArray(data.likedTracks) ? data.likedTracks : [],
      playbackSession: data.playbackSession || null,
      updatedAt: data.updatedAt,
    };
  } catch (err) {
    console.warn('[Firestore Sync] Failed to fetch user data:', err);
    return null;
  }
}

/**
 * Listen in real-time to Firestore updates for this user.
 * Whenever Device A updates likes, playlists, or playback, Device B receives it immediately!
 */
export function subscribeToUserCloudData(
  uid: string,
  onData: (data: CloudUserData) => void
): Unsubscribe | null {
  const { db } = getFirebaseServices();
  if (!db || !uid) return null;

  try {
    const userDocRef = doc(db, 'users', uid);
    return onSnapshot(
      userDocRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        onData({
          profile: data.profile,
          playlists: Array.isArray(data.playlists) ? data.playlists : [],
          likedTracks: Array.isArray(data.likedTracks) ? data.likedTracks : [],
          playbackSession: data.playbackSession || null,
          updatedAt: data.updatedAt,
        });
      },
      (err) => {
        console.warn('[Firestore Sync] Realtime subscription error:', err);
      }
    );
  } catch (err) {
    console.warn('[Firestore Sync] Could not create snapshot listener:', err);
    return null;
  }
}
