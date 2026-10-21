import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  User,
  LogIn,
} from 'lucide-react';
import type { ThemePalette, ViewType, UserProfile } from '../types';

interface TopNavProps {
  currentView: ViewType;
  theme?: ThemePalette;
  onThemeChange?: (theme: ThemePalette) => void;
  onOpenSettings?: () => void;
  onGoBack?: () => void;
  onGoForward?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentView,
  onOpenSettings,
  onGoBack,
  onGoForward,
  canGoBack = false,
  canGoForward = false,
  currentUser = null,
  onOpenAuthModal,
}) => {
  return (
    <header className="pro-top-nav">
      {/* Left: History Navigation & Breadcrumb & Mobile Profile */}
      <div className="top-nav-left-group">
        {/* Mobile Left Top Profile Button */}
        <button
          type="button"
          className="top-nav-mobile-profile-btn"
          onClick={currentView === 'settings' ? onGoBack : (currentUser ? onOpenSettings : onOpenAuthModal)}
          title={currentUser ? `${currentUser.displayName} (Settings)` : 'Sign in'}
          aria-label="Profile and settings"
        >
          <div className="mobile-profile-avatar-circle">
            {currentUser?.photoUrl ? (
              <img src={currentUser.photoUrl} alt={currentUser.displayName} className="mobile-avatar-img" />
            ) : (
              <span>{currentUser ? currentUser.displayName.charAt(0).toUpperCase() : 'P'}</span>
            )}
          </div>
        </button>

        <div className="history-buttons-pair">
          <button
            type="button"
            className="history-nav-circle"
            onClick={onGoBack}
            disabled={!canGoBack}
            title="Go back (Alt + Left)"
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="history-nav-circle"
            onClick={onGoForward}
            disabled={!canGoForward}
            title="Go forward (Alt + Right)"
            aria-label="Forward"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <span className="current-view-title-pill">
          {currentView === 'home' && 'Home & Discover'}
          {currentView === 'search' && 'Search & Explore'}
          {currentView === 'playlist' && 'Playlist'}
          {currentView === 'liked' && 'Liked Songs'}
          {currentView === 'library' && 'Your Library'}
          {currentView === 'settings' && 'Settings & Preferences'}
        </span>
      </div>

      {/* Right: User Profile / Sign In */}
      <div className="top-nav-right-group">
        {/* User Profile or Sign In Button */}
        {currentUser ? (
          <div
            className="user-profile-badge is-logged-in"
            onClick={onOpenSettings}
            role="button"
            tabIndex={0}
            title={`${currentUser.displayName} (${currentUser.provider.toUpperCase()})`}
          >
            <div className="avatar-circle">
              {currentUser.photoUrl ? (
                <img
                  src={currentUser.photoUrl}
                  alt={currentUser.displayName}
                  className="top-nav-avatar-img"
                />
              ) : (
                <User size={15} />
              )}
            </div>
            <span className="user-profile-name">{currentUser.displayName}</span>
          </div>
        ) : (
          <button
            type="button"
            className="top-nav-signin-pill"
            onClick={onOpenAuthModal}
            title="Sign in with Google or Phone"
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
