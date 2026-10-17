import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Home,
  Search,
  Library,
  Plus,
  Heart,
  Music,
  Trash2,
  AudioWaveform,
  Pin,
  X,
  Play,
  Compass,
  ListMusic,
  User,
  ArrowRight,
  Settings,
} from 'lucide-react';
import type { Playlist, ViewType, MusicTrack } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType, playlistId?: string) => void;
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  likedCount: number;
  likedTracks?: MusicTrack[];
  onPlayTrack?: (track: MusicTrack, queue?: MusicTrack[]) => void;
  onOpenCreateModal: () => void;
  onDeletePlaylist: (id: string) => void;
  onQuickExplore: (category: string) => void;
}

type LibrarySearchScope = 'all' | 'playlists' | 'tracks' | 'artists';

const SCOPE_PLACEHOLDERS: Record<LibrarySearchScope, string> = {
  all: 'Search songs, playlists, artists...',
  playlists: 'Filter playlists by name...',
  tracks: 'Search saved song titles...',
  artists: 'Find tracks by artist name...',
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  playlists,
  selectedPlaylistId,
  likedCount,
  likedTracks = [],
  onPlayTrack,
  onOpenCreateModal,
  onDeletePlaylist,
  onQuickExplore,
}) => {
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'custom' | 'curated'>('all');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<LibrarySearchScope>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Escape key closes library search
  useEffect(() => {
    if (!showSearch) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  // Focus input when search bar opens
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [showSearch]);

  // Unified pool of unique tracks across Liked Songs and all Playlists
  const allLibraryTracks = useMemo(() => {
    const map = new Map<string, MusicTrack>();
    likedTracks.forEach((t) => map.set(t.id, t));
    playlists.forEach((p) => {
      p.tracks.forEach((t) => {
        if (!map.has(t.id)) map.set(t.id, t);
      });
    });
    return Array.from(map.values());
  }, [likedTracks, playlists]);

  // Compute matching playlists
  const matchingPlaylists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return playlists.filter((pl) => {
      if (libraryFilter === 'custom' && !pl.isCustom) return false;
      if (libraryFilter === 'curated' && pl.isCustom) return false;
      if (!q) return true;

      if (searchScope === 'playlists') {
        return (
          pl.name.toLowerCase().includes(q) ||
          (pl.description && pl.description.toLowerCase().includes(q))
        );
      }
      if (searchScope === 'artists') {
        return (
          pl.name.toLowerCase().includes(q) ||
          pl.tracks.some((t) => t.artist.toLowerCase().includes(q))
        );
      }
      if (searchScope === 'tracks') {
        return pl.tracks.some((t) => t.title.toLowerCase().includes(q));
      }
      // 'all'
      return (
        pl.name.toLowerCase().includes(q) ||
        (pl.description && pl.description.toLowerCase().includes(q)) ||
        pl.tracks.some(
          (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
        )
      );
    });
  }, [playlists, libraryFilter, searchQuery, searchScope]);

  // Compute matching tracks (when searching)
  const matchingTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || searchScope === 'playlists') return [];

    return allLibraryTracks.filter((t) => {
      if (searchScope === 'tracks') {
        return t.title.toLowerCase().includes(q);
      }
      if (searchScope === 'artists') {
        return t.artist.toLowerCase().includes(q);
      }
      // 'all'
      return (
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.album && t.album.toLowerCase().includes(q))
      );
    });
  }, [allLibraryTracks, searchQuery, searchScope]);

  const hasSearchText = Boolean(searchQuery.trim());

  return (
    <aside className="pro-sidebar" aria-label="Main Navigation">
      {/* Brand Header */}
      <div className="sidebar-brand-header">
        <div className="brand-icon-halo">
          <AudioWaveform size={22} className="brand-wave-icon" />
        </div>
        <div className="brand-titles">
          <span className="brand-name">Seeder Play</span>
          <span className="brand-tagline">Desktop Audio Experience</span>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="sidebar-primary-nav">
        <button
          type="button"
          className={`sidebar-nav-tab ${currentView === 'home' ? 'is-active' : ''}`}
          onClick={() => onNavigate('home')}
        >
          <Home size={20} className="nav-icon" />
          <span className="nav-text">Home</span>
          {currentView === 'home' && <span className="nav-active-pill" />}
        </button>

        <button
          type="button"
          className={`sidebar-nav-tab ${currentView === 'search' ? 'is-active' : ''}`}
          onClick={() => onNavigate('search')}
        >
          <Search size={20} className="nav-icon" />
          <span className="nav-text">Search</span>
          {currentView === 'search' && <span className="nav-active-pill" />}
        </button>

        <button
          type="button"
          className={`sidebar-nav-tab ${currentView === 'settings' ? 'is-active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <Settings size={20} className="nav-icon" />
          <span className="nav-text">Settings</span>
          {currentView === 'settings' && <span className="nav-active-pill" />}
        </button>
      </nav>

      {/* Redesigned Elevated Library Card Panel */}
      <div className="sidebar-library-panel">
        <div className="library-panel-header">
          <div className="library-title-row">
            <Library size={19} className="library-icon" />
            <span className="library-title-text">Your Library</span>
          </div>

          <div className="library-header-actions">
            <button
              type="button"
              className={`lib-action-icon-btn ${showSearch ? 'is-active' : ''}`}
              onClick={() => {
                const nextState = !showSearch;
                setShowSearch(nextState);
                if (!nextState) setSearchQuery('');
              }}
              title={showSearch ? 'Close search (Esc)' : 'Search in library'}
              aria-label={showSearch ? 'Close library search' : 'Open library search'}
            >
              {showSearch ? <X size={16} /> : <Search size={16} />}
            </button>

            <button
              type="button"
              className="create-playlist-trigger-btn"
              onClick={onOpenCreateModal}
              title="Create new playlist"
              aria-label="Create playlist"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Clean Animated Library Search Bar (Expands as a crisp search box without glow) */}
        {showSearch && (
          <div className={`creative-lib-search-container ${isSearchFocused ? 'is-focused' : ''}`}>
            {/* Main Search Capsule */}
            <div className="creative-lib-search-capsule">
              <Search size={14} className="lib-search-glyph" />

              {/* Input Field with Dynamic Placeholder */}
              <input
                ref={searchInputRef}
                type="text"
                className="creative-lib-search-input"
                placeholder={SCOPE_PLACEHOLDERS[searchScope]}
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />

              {/* Action Buttons: Clear & Escape Hint */}
              <div className="lib-search-actions-right">
                {searchQuery && (
                  <button
                    type="button"
                    className="lib-search-clear-btn"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    title="Clear query"
                    aria-label="Clear query"
                  >
                    <X size={12} />
                  </button>
                )}
                <span
                  className="lib-search-esc-hint"
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  title="Close search (Esc)"
                >
                  Esc
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Regular Library Filter Chips (Shown when search is closed) */}
        {!showSearch && (
          <div className="library-filter-chips-row">
            <button
              type="button"
              className={`lib-chip-btn ${libraryFilter === 'all' ? 'is-active' : ''}`}
              onClick={() => setLibraryFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`lib-chip-btn ${libraryFilter === 'custom' ? 'is-active' : ''}`}
              onClick={() => setLibraryFilter('custom')}
            >
              By You
            </button>
            <button
              type="button"
              className={`lib-chip-btn ${libraryFilter === 'curated' ? 'is-active' : ''}`}
              onClick={() => setLibraryFilter('curated')}
            >
              Curated
            </button>
          </div>
        )}

        {/* Playlists & Liked Songs Scroll List */}
        <div className="library-scroll-list">
          {/* SEARCH ACTIVE: Render matching tracks and matching playlists */}
          {hasSearchText ? (
            <>
              {/* Matching Tracks Section */}
              {matchingTracks.length > 0 && (
                <div className="lib-search-section-group">
                  <div className="lib-search-section-header">
                    <Music size={12} className="section-accent" />
                    <span>Matching Songs ({matchingTracks.length})</span>
                  </div>
                  {matchingTracks.slice(0, 6).map((track) => (
                    <div
                      key={track.id}
                      className="lib-track-search-row"
                      onClick={() => onPlayTrack?.(track, matchingTracks)}
                      role="button"
                      tabIndex={0}
                      title={`Play "${track.title}"`}
                    >
                      <img
                        src={track.thumbnailUrl || '/assets/default-art.png'}
                        alt={track.title}
                        className="lib-track-thumb"
                        loading="lazy"
                      />
                      <div className="lib-track-meta">
                        <span className="lib-track-title" title={track.title}>
                          {track.title}
                        </span>
                        <span className="lib-track-artist" title={track.artist}>
                          {track.artist}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="lib-track-play-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayTrack?.(track, matchingTracks);
                        }}
                        title="Play Song"
                      >
                        <Play size={10} fill="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Matching Playlists Section */}
              {matchingPlaylists.length > 0 && (
                <div className="lib-search-section-group">
                  <div className="lib-search-section-header">
                    <ListMusic size={12} className="section-accent" />
                    <span>Matching Playlists ({matchingPlaylists.length})</span>
                  </div>
                  {matchingPlaylists.map((pl) => {
                    const isSelected = currentView === 'playlist' && selectedPlaylistId === pl.id;
                    return (
                      <div
                        key={pl.id}
                        className={`library-row-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => onNavigate('playlist', pl.id)}
                      >
                        {pl.coverUrl ? (
                          <img
                            src={pl.coverUrl}
                            alt={pl.name}
                            className="playlist-thumbnail"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%231e1c18'/%3E%3Cpath d='M20 14v12m0-6a3 3 0 1 1-3-3 3 3 0 0 1 3 3zm0 0v-3l6-2v5' fill='none' stroke='%23f59e0b' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E";
                            }}
                          />
                        ) : (
                          <div className="playlist-thumbnail-fallback">
                            <Music size={16} />
                          </div>
                        )}
                        <div className="library-row-meta">
                          <span className="row-item-title" title={pl.name}>
                            {pl.name}
                          </span>
                          <span className="row-item-subtitle">
                            {pl.isCustom ? 'Custom' : 'Mix'} • {pl.tracks.length}{' '}
                            {pl.tracks.length === 1 ? 'song' : 'songs'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No matches fallback with online search prompt */}
              {matchingTracks.length === 0 && matchingPlaylists.length === 0 && (
                <div className="lib-search-no-results">
                  <Search size={22} className="empty-glyph" />
                  <span className="no-res-text">No library matches for "{searchQuery}"</span>
                  <button
                    type="button"
                    className="lib-search-online-btn"
                    onClick={() => onQuickExplore(searchQuery)}
                  >
                    <span>Search YouTube Music</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* DEFAULT VIEW: Liked Songs Pinned + Filtered Playlists */
            <>
              {/* Liked Songs Tile (always pinned at top) */}
              <button
                type="button"
                className={`library-row-item liked-pinned-row ${
                  currentView === 'liked' ? 'is-selected' : ''
                }`}
                onClick={() => onNavigate('liked')}
              >
                <div className="liked-artwork-gradient">
                  <Heart size={18} fill="#ffffff" color="#ffffff" />
                </div>
                <div className="library-row-meta">
                  <span className="row-item-title">Liked Songs</span>
                  <span className="row-item-subtitle">
                    <Pin size={11} className="pin-icon" /> Playlist • {likedCount}{' '}
                    {likedCount === 1 ? 'track' : 'tracks'}
                  </span>
                </div>
              </button>

              {/* User & Curated Playlists */}
              {matchingPlaylists.map((pl) => {
                const isSelected = currentView === 'playlist' && selectedPlaylistId === pl.id;
                return (
                  <div
                    key={pl.id}
                    className={`library-row-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => onNavigate('playlist', pl.id)}
                  >
                    {pl.coverUrl ? (
                      <img
                        src={pl.coverUrl}
                        alt={pl.name}
                        className="playlist-thumbnail"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%231e1c18'/%3E%3Cpath d='M20 14v12m0-6a3 3 0 1 1-3-3 3 3 0 0 1 3 3zm0 0v-3l6-2v5' fill='none' stroke='%23f59e0b' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E";
                        }}
                      />
                    ) : (
                      <div className="playlist-thumbnail-fallback">
                        <Music size={16} />
                      </div>
                    )}
                    <div className="library-row-meta">
                      <span className="row-item-title" title={pl.name}>
                        {pl.name}
                      </span>
                      <span className="row-item-subtitle">
                        {pl.isCustom ? 'Custom' : 'Mix'} • {pl.tracks.length}{' '}
                        {pl.tracks.length === 1 ? 'song' : 'songs'}
                      </span>
                    </div>

                    {pl.isCustom && (
                      <button
                        type="button"
                        className="delete-custom-playlist-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete playlist "${pl.name}"?`)) {
                            onDeletePlaylist(pl.id);
                          }
                        }}
                        title="Delete playlist"
                        aria-label={`Delete playlist ${pl.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
