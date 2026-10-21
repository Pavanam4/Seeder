import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Search,
  Library,
  Users,
  User,
} from 'lucide-react';
import type { Playlist, ViewType, MusicTrack, UserProfile } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType, playlistId?: string) => void;
  playlists?: Playlist[];
  selectedPlaylistId?: string | null;
  likedCount?: number;
  likedTracks?: MusicTrack[];
  onPlayTrack?: (track: MusicTrack, queue?: MusicTrack[]) => void;
  onOpenCreateModal?: () => void;
  onDeletePlaylist?: (id: string) => void;
  onQuickExplore?: (category: string) => void;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  currentUser,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 140);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const navItems = [
    {
      id: 'home' as ViewType,
      label: 'Home',
      icon: Home,
      isActive: currentView === 'home',
      onClick: () => onNavigate('home'),
    },
    {
      id: 'search' as ViewType,
      label: 'Search',
      icon: Search,
      isActive: currentView === 'search',
      onClick: () => onNavigate('search'),
    },
    {
      id: 'library' as ViewType,
      label: 'Library',
      icon: Library,
      isActive: currentView === 'library',
      onClick: () => onNavigate('library'),
    },
    {
      id: 'liked' as ViewType,
      label: 'Socials',
      icon: Users,
      isActive: currentView === 'liked',
      onClick: () => onNavigate('liked'),
    },
    {
      id: 'settings' as ViewType,
      label: currentUser ? currentUser.displayName.split(' ')[0] : 'Profile',
      icon: User,
      isActive: currentView === 'settings',
      onClick: () => onNavigate('settings'),
    },
  ];

  return (
    <div
      className={`sidebar-rail-wrapper ${isHovered ? 'is-hovered' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <aside
        className={`pro-sidebar ${isHovered ? 'is-expanded' : 'is-collapsed'}`}
        aria-label="Main Navigation"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <nav className="sidebar-primary-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isProfile = item.id === 'settings';
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-tab ${item.isActive ? 'is-active' : ''}`}
                onClick={item.onClick}
                aria-label={item.label}
              >
                <div className="tab-icon-wrapper">
                  {isProfile && currentUser?.photoUrl ? (
                    <div className="sidebar-avatar-thumb-wrapper">
                      <img
                        src={currentUser.photoUrl}
                        alt={currentUser.displayName}
                        className="sidebar-avatar-img"
                      />
                      <span className="sidebar-avatar-online-dot" />
                    </div>
                  ) : (
                    <Icon size={24} strokeWidth={1.8} className="nav-icon" />
                  )}
                </div>
                <span className="nav-text">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
};
