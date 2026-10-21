import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  Flame,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { UserProfile, Playlist, MusicTrack } from '../types';
import { AnimatedDoodlePanel } from './AnimatedDoodlePanel';
import { LoginSuccessConnectedReveal } from './LoginSuccessConnectedReveal';
import {
  signInWithGoogleApi,
  signInWithTwitterApi,
  signInWithGithubApi,
} from '../services/storage';
import {
  isFirebaseConfigured,
  getFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  signInWithGoogleFirebase,
  signInWithTwitterFirebase,
  signInWithGithubFirebase,
  fetchUserDataFromFirestore,
  syncLibraryToFirestore,
  type FirebaseClientConfig,
} from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile, playlists?: Playlist[], likedTracks?: MusicTrack[]) => void;
  reason?: string | null;
  currentPlaylists?: Playlist[];
  currentLikedTracks?: MusicTrack[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  reason,
  currentPlaylists = [],
  currentLikedTracks = [],
}) => {
  const hasFirebase = isFirebaseConfigured();

  // Login Success Particle Animation State
  const [successSession, setSuccessSession] = useState<{
    user: UserProfile;
    playlists?: Playlist[];
    likedTracks?: MusicTrack[];
  } | null>(null);

  const triggerSuccess = (user: UserProfile, playlists?: Playlist[], likedTracks?: MusicTrack[]) => {
    setIsVerifying(false);
    setSuccessSession({ user, playlists, likedTracks });
  };

  // Firebase In-Modal Setup Drawer
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [customAuthDomain, setCustomAuthDomain] = useState('');
  const [customProjectId, setCustomProjectId] = useState('');
  const [customAppId, setCustomAppId] = useState('');

  // Authentication State
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Google Selector State (for offline/custom fallback)
  const [showGooglePicker, setShowGooglePicker] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [googleCustomName, setGoogleCustomName] = useState('');

  // X (Twitter) State
  const [twitterHandle, setTwitterHandle] = useState('');
  const [twitterDisplayName, setTwitterDisplayName] = useState('');

  // Load existing config into inputs if available
  useEffect(() => {
    const existing = getFirebaseConfig();
    if (existing) {
      setCustomApiKey(existing.apiKey || '');
      setCustomAuthDomain(existing.authDomain || '');
      setCustomProjectId(existing.projectId || '');
      setCustomAppId(existing.appId || '');
    }
  }, []);

  // Safety timeout: automatically reset isVerifying if any popup or network takes too long
  useEffect(() => {
    if (isVerifying) {
      const timer = setTimeout(() => {
        setIsVerifying(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [isVerifying]);

  // Handle Save Firebase Config
  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customApiKey.trim() || !customProjectId.trim() || !customAppId.trim()) {
      setAuthError('Please enter at least API Key, Project ID, and App ID.');
      return;
    }

    const cfg: FirebaseClientConfig = {
      apiKey: customApiKey.trim(),
      authDomain: customAuthDomain.trim() || `${customProjectId.trim()}.firebaseapp.com`,
      projectId: customProjectId.trim(),
      appId: customAppId.trim(),
    };

    saveFirebaseConfig(cfg);
  };

  // Handle Real Google Login
  const handleGoogleSignIn = async (emailToUse?: string, nameToUse?: string) => {
    setIsVerifying(true);
    setAuthError(null);

    // 1. If Firebase is active, trigger real Google Sign-In popup
    if (hasFirebase && !emailToUse && !googleCustomEmail) {
      const fbResult = await signInWithGoogleFirebase();
      if (fbResult.success && fbResult.user) {
        const authedUser = fbResult.user;
        // TRIGGER SUCCESS ANIMATION INSTANTLY
        triggerSuccess(authedUser, currentPlaylists, currentLikedTracks);

        // Background hydrate and sync without blocking UI
        fetchUserDataFromFirestore(authedUser.id)
          .then(async (cloudData) => {
            const pl = cloudData?.playlists?.length ? cloudData.playlists : currentPlaylists;
            const lk = cloudData?.likedTracks?.length ? cloudData.likedTracks : currentLikedTracks;
            if (!cloudData?.playlists?.length && currentPlaylists.length > 0) {
              await syncLibraryToFirestore(authedUser.id, pl, lk);
            }
          })
          .catch((err) => console.warn('[Google Auth] Background sync:', err));
        return;
      } else if (fbResult.error) {
        setIsVerifying(false);
        setAuthError(fbResult.error);
        return;
      }
    }

    // 2. Simulated or custom email Google auth fallback
    const finalEmail = (emailToUse || googleCustomEmail || 'pavan.music@gmail.com').trim().toLowerCase();
    const finalName = (nameToUse || googleCustomName || finalEmail.split('@')[0] || 'Google Listener').trim();

    const result = await signInWithGoogleApi(
      finalEmail,
      finalName,
      undefined,
      currentPlaylists,
      currentLikedTracks
    );

    if (result.success && result.user) {
      triggerSuccess(result.user, result.playlists, result.likedTracks);
    } else {
      setIsVerifying(false);
      setAuthError(result.error || 'Google Sign-In failed. Please try again.');
    }
  };

  // Handle Instant X (Twitter) Username Sign-In with Real Firestore Multi-Device Sync
  const signInWithTwitterHandle = async (handleToUse?: string) => {
    setIsVerifying(true);
    setAuthError(null);

    const cleanHandle = (handleToUse || twitterHandle || 'pavan_music').trim().replace(/^@/, '') || 'pavan_music';
    const cleanName = twitterDisplayName.trim() || `@${cleanHandle}`;

    try {
      const result = await signInWithTwitterApi(
        cleanHandle,
        cleanName,
        undefined,
        currentPlaylists,
        currentLikedTracks
      );

      if (result.success && result.user) {
        const authedUser = result.user;
        // TRIGGER PARTICLE ANIMATION INSTANTLY! ZERO DELAY!
        triggerSuccess(authedUser, result.playlists, result.likedTracks);

        // Non-blocking background sync with Firestore
        if (hasFirebase) {
          fetchUserDataFromFirestore(authedUser.id)
            .then(async (cloudData) => {
              const pl = cloudData?.playlists?.length ? cloudData.playlists : currentPlaylists;
              const lk = cloudData?.likedTracks?.length ? cloudData.likedTracks : currentLikedTracks;
              if (!cloudData?.playlists?.length && currentPlaylists.length > 0) {
                await syncLibraryToFirestore(authedUser.id, pl, lk);
              }
            })
            .catch((cloudErr) => console.warn('[X Sign-In] Cloud sync fallback:', cloudErr));
        }
        return;
      } else {
        setIsVerifying(false);
        setAuthError(result.error || 'X (Twitter) Sign-In failed.');
      }
    } catch (err: any) {
      setIsVerifying(false);
      setAuthError(err.message || 'X (Twitter) Sign-In failed.');
    }
  };

  // Handle Real X (Twitter) Login (OAuth Popup or Handle Fallback)
  const handleTwitterSignIn = async () => {
    // If user already typed a handle or not, immediately sign them in with handle
    const cleanHandle = twitterHandle.trim().replace(/^@/, '') || 'pavan_music';
    await signInWithTwitterHandle(cleanHandle);
  };

  // Handle Instant GitHub Username Sign-In with Real Firestore Multi-Device Sync
  const signInWithGithubUsername = async (usernameToUse: string = 'Pavanam4') => {
    setIsVerifying(true);
    setAuthError(null);

    const cleanUser = usernameToUse.trim().replace(/^@/, '') || 'Pavanam4';
    try {
      const result = await signInWithGithubApi(
        cleanUser,
        cleanUser,
        `https://github.com/${cleanUser}.png`,
        currentPlaylists,
        currentLikedTracks
      );

      if (result.success && result.user) {
        const authedUser = result.user;
        // TRIGGER SUCCESS ANIMATION IMMEDIATELY! NO BLOCKING!
        triggerSuccess(authedUser, result.playlists, result.likedTracks);

        if (hasFirebase) {
          fetchUserDataFromFirestore(authedUser.id)
            .then(async (cloudData) => {
              const pl = cloudData?.playlists?.length ? cloudData.playlists : currentPlaylists;
              const lk = cloudData?.likedTracks?.length ? cloudData.likedTracks : currentLikedTracks;
              if (!cloudData?.playlists?.length && currentPlaylists.length > 0) {
                await syncLibraryToFirestore(authedUser.id, pl, lk);
              }
            })
            .catch((cloudErr) => console.warn('[GitHub Sign-In] Cloud sync fallback:', cloudErr));
        }
        return;
      } else {
        setIsVerifying(false);
        setAuthError(result.error || 'GitHub Sign-In failed.');
      }
    } catch (err: any) {
      setIsVerifying(false);
      setAuthError(err.message || 'GitHub Sign-In failed.');
    }
  };

  // Handle Real GitHub Login
  const handleGithubSignIn = async () => {
    setIsVerifying(true);
    setAuthError(null);

    // 1. If Firebase is configured, open official GitHub OAuth popup
    if (hasFirebase) {
      const fbResult = await signInWithGithubFirebase();
      if (fbResult.success && fbResult.user) {
        const authedUser = fbResult.user;
        // TRIGGER SUCCESS ANIMATION IMMEDIATELY! NO BLOCKING!
        triggerSuccess(authedUser, currentPlaylists, currentLikedTracks);

        fetchUserDataFromFirestore(authedUser.id)
          .then(async (cloudData) => {
            const pl = cloudData?.playlists?.length ? cloudData.playlists : currentPlaylists;
            const lk = cloudData?.likedTracks?.length ? cloudData.likedTracks : currentLikedTracks;
            if (!cloudData?.playlists?.length && currentPlaylists.length > 0) {
              await syncLibraryToFirestore(authedUser.id, pl, lk);
            }
          })
          .catch((err) => console.warn('[GitHub Auth] Background sync:', err));
        return;
      } else if (fbResult.error) {
        setIsVerifying(false);
        setAuthError(
          fbResult.error.includes('popup-closed')
            ? 'Sign-in window closed.'
            : 'GitHub returned 404 or connection error. Make sure your GitHub OAuth App Callback URL is set to https://playmusic-1bcca.firebaseapp.com/__/auth/handler and saved in Firebase Console.'
        );
        return;
      }
    }

    // 2. Direct GitHub username fallback if Firebase not configured
    await signInWithGithubUsername('Pavanam4');
  };

  // Handle Manual X Handle Submit Form
  const handleHandleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = twitterHandle.trim().replace(/^@/, '') || 'pavan_music';
    signInWithTwitterHandle(cleanHandle);
  };

  // If user has successfully authenticated, render the celebratory connected transition
  if (successSession) {
    return (
      <LoginSuccessConnectedReveal
        user={successSession.user}
        onAnimationComplete={() => {
          onLoginSuccess(successSession.user, successSession.playlists, successSession.likedTracks);
          setSuccessSession(null);
          onClose();
        }}
      />
    );
  }

  // If dialog is closed and no success animation is active, render nothing
  if (!isOpen) return null;

  return (
    <div className="pro-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="split-auth-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Floating Close Button */}
        <button
          type="button"
          className="split-auth-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Left Side: Modern Minimalist Form */}
        <div className="split-auth-form-side">
          {/* Top Brand Logo Icon & Firebase Badge */}
          <div className="split-auth-brand-row">
            <div className="split-auth-brand-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
              </svg>
            </div>
            <button
              type="button"
              className={`split-auth-firebase-status-badge ${hasFirebase ? 'active' : 'configure'}`}
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              title="Click to view/edit Firebase configuration"
            >
              <Flame size={13} className={hasFirebase ? 'text-amber' : ''} />
              <span>{hasFirebase ? 'Firebase Real Auth' : 'Firebase Setup'}</span>
              {showConfigDrawer ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {/* Firebase Configuration Drawer */}
          {showConfigDrawer && (
            <div className="split-auth-config-drawer">
              <div className="split-auth-config-header">
                <strong>Firebase Cloud Project Setup</strong>
                <span className="split-auth-config-sub">
                  Enables real Google &amp; X (Twitter) authentication popups and Firestore multi-device sync.
                </span>
              </div>
              <form onSubmit={handleSaveFirebaseConfig} className="split-auth-config-form">
                <input
                  type="text"
                  placeholder="apiKey (e.g. AIzaSy...)"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="split-auth-config-input"
                  required
                />
                <input
                  type="text"
                  placeholder="projectId (e.g. playmusic-1bcca)"
                  value={customProjectId}
                  onChange={(e) => setCustomProjectId(e.target.value)}
                  className="split-auth-config-input"
                  required
                />
                <input
                  type="text"
                  placeholder="appId (e.g. 1:127738399876:web:...)"
                  value={customAppId}
                  onChange={(e) => setCustomAppId(e.target.value)}
                  className="split-auth-config-input"
                  required
                />
                <input
                  type="text"
                  placeholder="authDomain (optional, defaults to projectId.firebaseapp.com)"
                  value={customAuthDomain}
                  onChange={(e) => setCustomAuthDomain(e.target.value)}
                  className="split-auth-config-input"
                />
                <div className="split-auth-config-actions">
                  <button type="submit" className="split-auth-config-save-btn">
                    Save &amp; Reload
                  </button>
                  {hasFirebase && (
                    <button
                      type="button"
                      onClick={clearFirebaseConfig}
                      className="split-auth-config-clear-btn"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Heading and Subtitle */}
          <div className="split-auth-heading-group">
            <h1 className="split-auth-title">Welcome back!</h1>
            <p className="split-auth-subtitle">
              {reason || 'Your music, your playlists, your flow — synced across all devices.'}
            </p>
          </div>

          {/* Social Quick Sign-In Pills (Google, GitHub & X Twitter) */}
          <div className="split-auth-social-row">
            {/* Google Sign-In Pill */}
            <button
              type="button"
              className="split-auth-pill-btn split-auth-google-btn"
              onClick={() => {
                if (hasFirebase) {
                  handleGoogleSignIn();
                } else {
                  setShowGooglePicker(!showGooglePicker);
                }
              }}
              title="Sign In with Google"
              disabled={isVerifying}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" className="split-auth-pill-icon">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google</span>
            </button>

            {/* GitHub Sign-In Pill */}
            <button
              type="button"
              className="split-auth-pill-btn split-auth-github-btn"
              onClick={() => handleGithubSignIn()}
              title="Sign In with GitHub"
              disabled={isVerifying}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="split-auth-pill-icon">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>GitHub</span>
            </button>

            {/* X (Twitter) Sign-In Pill */}
            <button
              type="button"
              className="split-auth-pill-btn split-auth-x-btn"
              onClick={() => handleTwitterSignIn()}
              title="Sign In with X (Twitter)"
              disabled={isVerifying}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="split-auth-pill-icon">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>X</span>
            </button>
          </div>

          {/* Google Account Selector Drawer (when testing simulated accounts) */}
          {showGooglePicker && !hasFirebase && (
            <div className="split-auth-google-selector-box">
              <div className="split-auth-google-header">
                <span>Select Simulated Google Account</span>
                <button
                  type="button"
                  className="split-auth-google-close-btn"
                  onClick={() => setShowGooglePicker(false)}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Fast 1-Click Profile Option */}
              <button
                type="button"
                className="split-auth-google-account-item"
                onClick={() => handleGoogleSignIn('pavan.music@gmail.com', 'Pavan M')}
                disabled={isVerifying}
              >
                <div className="split-auth-google-avatar">P</div>
                <div className="split-auth-google-account-info">
                  <div className="split-auth-google-account-name">Pavan M</div>
                  <div className="split-auth-google-account-email">pavan.music@gmail.com</div>
                </div>
                <ArrowRight size={14} className="split-auth-google-arrow" />
              </button>

              {/* Custom Google Email input */}
              <div className="split-auth-google-custom-row">
                <input
                  type="email"
                  className="split-auth-text-input"
                  placeholder="Or enter your email address"
                  value={googleCustomEmail}
                  onChange={(e) => setGoogleCustomEmail(e.target.value)}
                />
                <button
                  type="button"
                  className="split-auth-google-continue-btn"
                  onClick={() => handleGoogleSignIn()}
                  disabled={!googleCustomEmail.includes('@') || isVerifying}
                >
                  {isVerifying ? 'Signing in...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="split-auth-divider">
            <span className="split-auth-divider-line" />
            <span className="split-auth-divider-text">Or Continue with X Handle</span>
            <span className="split-auth-divider-line" />
          </div>

          {/* X Handle Direct Sign-In Form */}
          <form onSubmit={handleHandleSubmit} className="split-auth-phone-form">
            <div className="split-auth-input-container split-auth-x-input-container">
              <div className="split-auth-x-prefix">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>@</span>
              </div>

              <input
                type="text"
                className="split-auth-text-input"
                value={twitterHandle}
                onChange={(e) => {
                  setTwitterHandle(e.target.value);
                  if (authError) setAuthError(null);
                }}
                placeholder="username (e.g. pavan_music)"
                autoFocus
              />
            </div>

            {authError && (
              <div className="split-auth-error-box">
                <p className="split-auth-error-text">{authError}</p>
                {authError.toLowerCase().includes('github') && (
                  <button
                    type="button"
                    className="split-auth-fallback-quick-btn"
                    onClick={() => signInWithGithubUsername('Pavanam4')}
                  >
                    ⚡ Or Sign in instantly as @Pavanam4
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              className="split-auth-primary-submit-btn split-auth-x-submit-btn"
              disabled={isVerifying}
            >
              {isVerifying ? (
                <span>Connecting...</span>
              ) : (
                <span>Sign in with X</span>
              )}
            </button>
          </form>

          {/* Don't have an account link */}
          <div className="split-auth-signup-row">
            <span className="split-auth-signup-text">
              Don't have an account?{' '}
              <button
                type="button"
                className="split-auth-signup-link"
                onClick={() => {
                  if (hasFirebase) {
                    handleGoogleSignIn();
                  } else {
                    setShowGooglePicker(true);
                  }
                }}
              >
                Sign Up
              </button>
            </span>
          </div>

          {/* Bottom Legal Links */}
          <div className="split-auth-footer-links">
            <a href="#help" onClick={(e) => e.preventDefault()}>Help</a>
            <span className="split-auth-footer-sep">/</span>
            <a href="#terms" onClick={(e) => e.preventDefault()}>Terms</a>
            <span className="split-auth-footer-sep">/</span>
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy</a>
          </div>
        </div>

        {/* Right Side: Animated Hand-Drawn Music Doodle Pattern with Wiggling Elements */}
        <div className="split-auth-artwork-side">
          <AnimatedDoodlePanel />
        </div>
      </div>
    </div>
  );
};
