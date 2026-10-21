import React, { useEffect, useState } from 'react';
import type { UserProfile } from '../types';

interface LoginSuccessConnectedRevealProps {
  user: UserProfile;
  onAnimationComplete: () => void;
}

export const LoginSuccessConnectedReveal: React.FC<LoginSuccessConnectedRevealProps> = ({
  user,
  onAnimationComplete,
}) => {
  const [isEntering, setIsEntering] = useState(true);
  const [isDocked, setIsDocked] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [isDissolving, setIsDissolving] = useState(false);

  useEffect(() => {
    // 1. Initial smooth defocus-to-focus entrance
    const enterTimer = requestAnimationFrame(() => {
      setIsEntering(false);
    });

    // 2. Silky magnetic docking of the two circles
    const dockTimer = setTimeout(() => {
      setIsDocked(true);
      setShowContent(true);
    }, 280);

    // 3. Smooth cinematic blur dissolve exit
    const dissolveTimer = setTimeout(() => {
      setIsDissolving(true);
    }, 2400);

    // 4. Complete animation and transition into app
    const finishTimer = setTimeout(() => {
      onAnimationComplete();
    }, 2850);

    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(dockTimer);
      clearTimeout(dissolveTimer);
      clearTimeout(finishTimer);
    };
  }, [onAnimationComplete]);

  // Account identifier display logic
  const accountIdentifier =
    user.username || user.displayName || (user.email ? user.email.split('@')[0] : 'Your account');

  const providerLabel =
    user.provider === 'twitter'
      ? 'Connected with X'
      : user.provider === 'google'
      ? 'Connected with Google'
      : user.provider === 'github'
      ? 'Connected with GitHub'
      : 'Account connected';

  return (
    <div
      className={`smooth-connected-overlay ${isEntering ? 'smooth-enter' : ''} ${
        isDissolving ? 'smooth-exit' : ''
      }`}
      onClick={onAnimationComplete}
      title="Click anywhere to continue"
      role="alert"
      aria-live="polite"
    >
      {/* Cinematic Ambient Blurred Aurora Orbs (Smooth, organic, 0 particles) */}
      <div className="smooth-aurora-glow aurora-purple" />
      <div className="smooth-aurora-glow aurora-cyan" />
      <div className="smooth-aurora-glow aurora-center" />

      {/* Top Floating Frosted Pill Badge */}
      <div className={`smooth-top-pill ${showContent ? 'visible' : ''}`}>
        <div className="smooth-check-circle">
          <svg viewBox="0 0 16 16" width="10" height="10" fill="none">
            <path
              d="M3.5 8.5L6.5 11.5L12.5 4.5"
              stroke="#ffffff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="smooth-pill-text">{providerLabel}</span>
      </div>

      {/* Central Connection Stage: Left Circle & Right Circle */}
      <div className="smooth-stage-center">
        {/* Soft Radial Ambient Bloom behind the connected discs */}
        <div className={`smooth-dock-bloom ${isDocked ? 'blooming' : ''}`} />

        <div className="smooth-circles-track">
          {/* Left Circle: Source Account (X/Twitter, Google, GitHub, or Avatar) */}
          <div
            className={`smooth-circle smooth-left-circle ${
              isDocked ? 'docked' : 'gliding-left'
            }`}
          >
            {user.photoUrl ? (
              <div className="smooth-avatar-frame">
                <img src={user.photoUrl} alt={user.displayName} className="smooth-avatar-pic" />
                {user.provider === 'twitter' && (
                  <div className="smooth-provider-badge twitter">
                    <svg viewBox="0 0 24 24" width="10" height="10" fill="#ffffff">
                      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                    </svg>
                  </div>
                )}
                {user.provider === 'google' && (
                  <div className="smooth-provider-badge google">
                    <svg viewBox="0 0 24 24" width="10" height="10">
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
                  </div>
                )}
              </div>
            ) : user.provider === 'twitter' ? (
              /* Light blue bird on dark frosted circle as in reference image */
              <div className="smooth-icon-wrap bird-icon">
                <svg viewBox="0 0 24 24" width="38" height="38" fill="#38bdf8">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                </svg>
              </div>
            ) : user.provider === 'google' ? (
              <div className="smooth-icon-wrap">
                <svg viewBox="0 0 24 24" width="34" height="34">
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
              </div>
            ) : user.provider === 'github' ? (
              <div className="smooth-icon-wrap">
                <svg viewBox="0 0 24 24" width="36" height="36" fill="#ffffff">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </div>
            ) : (
              <div className="smooth-initial-avatar">
                <span>{user.displayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Right Circle: Destination Seeder App (Pure White High-Contrast Disc) */}
          <div
            className={`smooth-circle smooth-right-circle ${
              isDocked ? 'docked' : 'gliding-right'
            }`}
          >
            <div className="smooth-seeder-logo">
              <svg width="42" height="42" viewBox="0 0 48 48" fill="none">
                {/* Slanted dual rounded pills forming geometric modern 'S' */}
                <rect
                  x="21"
                  y="6"
                  width="10"
                  height="22"
                  rx="5"
                  transform="rotate(28 21 6)"
                  fill="#000000"
                />
                <rect
                  x="17"
                  y="20"
                  width="10"
                  height="22"
                  rx="5"
                  transform="rotate(28 17 20)"
                  fill="#000000"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Soft Glowing Link Spark at Overlap Center */}
        <div className={`smooth-link-glow ${isDocked ? 'active' : ''}`} />
      </div>

      {/* Hero Typography: "Everything is Ready!" and Connection Narrative */}
      <div className={`smooth-text-section ${showContent ? 'visible' : ''}`}>
        <h1 className="smooth-title">Everything is Ready!</h1>
        <p className="smooth-subtitle">
          Connected <span className="smooth-highlight">{accountIdentifier}</span> to Seeder.
          <br />
          Library, liked tracks, and playback are smoothly synced across your devices.
        </p>
      </div>

      {/* Discreet Bottom Hint */}
      <div className="smooth-bottom-hint">Click anywhere to continue</div>
    </div>
  );
};
