import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
} from 'lucide-react';
import type { ThemePalette, ViewType } from '../types';

interface TopNavProps {
  currentView: ViewType;
  theme?: ThemePalette;
  onThemeChange?: (theme: ThemePalette) => void;
  onOpenSettings?: () => void;
  onGoBack?: () => void;
  onGoForward?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentView,
  onOpenSettings,
  onGoBack,
  onGoForward,
  canGoBack = false,
  canGoForward = false,
}) => {
  return (
    <header className="pro-top-nav">
      {/* Left: History Navigation & Breadcrumb & Mobile Profile */}
      <div className="top-nav-left-group">
        {/* Mobile Left Top Profile Button */}
        <button
          type="button"
          className="top-nav-mobile-profile-btn"
          onClick={onOpenSettings}
          title="Profile & Settings"
          aria-label="Profile and settings"
        >
          <div className="mobile-profile-avatar-circle">
            <span>P</span>
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

      {/* Right: Settings & User Profile */}
      <div className="top-nav-right-group">
        {/* Dedicated Settings Button */}
        <button
          type="button"
          className="top-nav-settings-btn"
          onClick={onOpenSettings}
          title="Settings & Audio Preferences"
          aria-label="Settings"
        >
          <Settings size={16} />
        </button>

        {/* Minimalist Profile Avatar */}
        <div
          className="user-profile-badge"
          onClick={onOpenSettings}
          role="button"
          tabIndex={0}
          title="Active Profile & Settings"
        >
          <div className="avatar-circle">
            <User size={15} />
          </div>
          <span className="user-profile-name">Listener</span>
        </div>
      </div>
    </header>
  );
};
