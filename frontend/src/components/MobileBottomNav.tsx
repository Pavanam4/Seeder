import React from 'react';
import { Home, Search, Library, Plus } from 'lucide-react';
import type { ViewType } from '../types';

interface MobileBottomNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onOpenCreateModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenCreateModal,
}) => {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <button
        type="button"
        className={`mobile-nav-item ${currentView === 'home' ? 'is-active' : ''}`}
        onClick={() => onNavigate('home')}
        aria-label="Home"
      >
        <Home size={22} className="mobile-nav-icon" />
        <span className="mobile-nav-label">Home</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${currentView === 'search' ? 'is-active' : ''}`}
        onClick={() => onNavigate('search')}
        aria-label="Search"
      >
        <Search size={22} className="mobile-nav-icon" />
        <span className="mobile-nav-label">Search</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${currentView === 'library' || currentView === 'liked' || currentView === 'playlist' ? 'is-active' : ''}`}
        onClick={() => onNavigate('library')}
        aria-label="Your Library"
      >
        <Library size={22} className="mobile-nav-icon" />
        <span className="mobile-nav-label">Your Library</span>
      </button>


      <button
        type="button"
        className="mobile-nav-item"
        onClick={onOpenCreateModal}
        aria-label="Create Playlist"
      >
        <Plus size={22} className="mobile-nav-icon create-icon" />
        <span className="mobile-nav-label">Create</span>
      </button>
    </nav>
  );
};
