import React, { useEffect, useState } from 'react';
import type { UserProfile } from '../types';
import { Check, Sparkles } from 'lucide-react';

interface LoginSuccessBlurRevealProps {
  user: UserProfile;
  onAnimationComplete: () => void;
}

export const LoginSuccessBlurReveal: React.FC<LoginSuccessBlurRevealProps> = ({
  user,
  onAnimationComplete,
}) => {
  const [isEntering, setIsEntering] = useState(true);
  const [isDissolving, setIsDissolving] = useState(false);

  useEffect(() => {
    // 1. Trigger smooth entrance on next frame
    const enterTimer = requestAnimationFrame(() => {
      setIsEntering(false);
    });

    // 2. Start soft blur dissolve
    const dissolveTimer = setTimeout(() => {
      setIsDissolving(true);
    }, 1100);

    // 3. Complete and smoothly transition into music app
    const finishTimer = setTimeout(() => {
      onAnimationComplete();
    }, 1500);

    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(dissolveTimer);
      clearTimeout(finishTimer);
    };
  }, [onAnimationComplete]);

  return (
    <div
      className={`blur-success-overlay ${isEntering ? 'blur-enter' : ''} ${isDissolving ? 'blur-exit' : ''}`}
      onClick={onAnimationComplete}
      title="Click anywhere to continue"
      role="alert"
      aria-live="polite"
    >
      {/* Ambient Frosted Blurred Light Orbs */}
      <div className="blur-success-aurora blur-aurora-1" />
      <div className="blur-success-aurora blur-aurora-2" />
      <div className="blur-success-aurora blur-aurora-3" />

      {/* Floating Glass Card */}
      <div className="blur-success-card">
        {/* User Profile Avatar with Emerald Check */}
        <div className="blur-success-avatar-wrapper">
          <img
            src={
              user.photoUrl ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                user.displayName || 'User'
              )}`
            }
            alt={user.displayName}
            className="blur-success-avatar"
          />
          <div className="blur-success-check-badge">
            <Check size={14} strokeWidth={3} className="text-white" />
          </div>
        </div>

        {/* Minimalist "You're in" Heading */}
        <h1 className="blur-success-title">You're in</h1>

        {/* Clean Subtitle */}
        <p className="blur-success-subtitle">
          Welcome back, <span className="blur-success-name">{user.displayName}</span>
        </p>

        {/* Subtle Sync Indicator Pill */}
        <div className="blur-success-pill">
          <Sparkles size={12} className="text-emerald-400" />
          <span>Library &amp; playback synced</span>
        </div>
      </div>

      {/* Discreet Tap to Continue Hint */}
      <div className="blur-success-hint">Click anywhere to continue</div>
    </div>
  );
};
