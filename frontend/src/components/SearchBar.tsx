import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Flame,
  Music,
  User,
  Disc3,
  ListMusic,
  Compass,
  CornerDownLeft,
  Play,
  Clock,
  History,
} from 'lucide-react';
import type { SearchFilterType, MusicTrack } from '../types';
import { searchTracks } from '../services/api';

interface SearchBarProps {
  onSearch: (query: string, filter?: SearchFilterType) => void;
  isLoading: boolean;
  selectedFilter: SearchFilterType;
  onFilterChange: (filter: SearchFilterType) => void;
  initialQuery?: string;
  liveResults?: MusicTrack[];
  onSelectTrack?: (track: MusicTrack, queue?: MusicTrack[]) => void;
  algorithmicTracks?: MusicTrack[];
  recentTracks?: MusicTrack[];
  trendingTracks?: MusicTrack[];
  searchHistory?: string[];
}

const FILTER_PILLS: { id: SearchFilterType; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All Results', icon: <Compass size={14} /> },
  { id: 'songs', label: 'Tracks', icon: <Music size={14} /> },
  { id: 'artists', label: 'Artists', icon: <User size={14} /> },
  { id: 'albums', label: 'Albums', icon: <Disc3 size={14} /> },
  { id: 'playlists', label: 'Playlists', icon: <ListMusic size={14} /> },
  { id: 'new_releases', label: 'Hot Drops', icon: <Flame size={14} /> },
];

const SEARCH_PROMPTS = [
  'Search tracks, artists, albums, or vibes...',
  "Try searching 'Daft Punk' or 'Coldplay'...",
  'Explore trending Malayalam, Hindi, or Tamil hits...',
  "Search moods: 'Synthwave', 'Midnight Drive', 'Lo-Fi'...",
  "Try 'Sid Sriram', 'Arijit Singh', or 'The Weeknd'...",
];

const MOBILE_BROWSE_CATEGORIES = [
  { id: 'trending', name: 'Trending Hits', color: '#e8115b', icon: '🔥' },
  { id: 'malayalam', name: 'Malayalam Hits', color: '#27856a', icon: '🌴' },
  { id: 'hindi', name: 'Hindi Cinema', color: '#ba5d07', icon: '🇮🇳' },
  { id: 'tamil', name: 'Tamil Beats', color: '#bc5900', icon: '⚡' },
  { id: 'punjabi', name: 'Punjabi Hot', color: '#e91429', icon: '💥' },
  { id: 'pop', name: 'Global Pop', color: '#1e3264', icon: '🎧' },
  { id: 'chill', name: 'Lo-Fi Chill', color: '#503750', icon: '☕' },
  { id: 'synth', name: 'Synthwave', color: '#477d95', icon: '🏎️' },
  { id: 'workout', name: 'Upbeat Energy', color: '#777777', icon: '💪' },
  { id: 'indie', name: 'Indie Soul', color: '#8c1932', icon: '🎸' },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  isLoading,
  selectedFilter,
  onFilterChange,
  initialQuery = '',
  liveResults = [],
  onSelectTrack,
  algorithmicTracks = [],
  recentTracks = [],
  trendingTracks = [],
  searchHistory = [],
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [activeAlgoTab, setActiveAlgoTab] = useState<'for_you' | 'recent' | 'trending'>('for_you');
  const [internalTrending, setInternalTrending] = useState<MusicTrack[]>([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [isFadingPrompt, setIsFadingPrompt] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Fetch fallback trending tracks if algorithmic tracks are not yet available
  useEffect(() => {
    let isMounted = true;
    searchTracks('Top Trending Songs', 1, 8, 'ytmusicapi', 'songs')
      .then((res) => {
        if (isMounted && res.items.length > 0) {
          setInternalTrending(res.items);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch fallback trending tracks:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute active algorithmic tracks based on user selection
  const effectiveForYou =
    algorithmicTracks && algorithmicTracks.length > 0
      ? algorithmicTracks
      : trendingTracks && trendingTracks.length > 0
      ? trendingTracks
      : internalTrending;

  const effectiveRecent =
    recentTracks && recentTracks.length > 0 ? recentTracks : effectiveForYou;

  const effectiveTrending =
    trendingTracks && trendingTracks.length > 0 ? trendingTracks : internalTrending;

  const activeTracks =
    activeAlgoTab === 'recent'
      ? effectiveRecent
      : activeAlgoTab === 'trending'
      ? effectiveTrending
      : effectiveForYou;

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Rotating suggestion prompt when input is empty
  useEffect(() => {
    if (query.trim() || isFocused) return;

    const interval = window.setInterval(() => {
      setIsFadingPrompt(true);
      setTimeout(() => {
        setPromptIndex((prev) => (prev + 1) % SEARCH_PROMPTS.length);
        setIsFadingPrompt(false);
      }, 300);
    }, 3800);

    return () => window.clearInterval(interval);
  }, [query, isFocused]);

  // Click outside to dismiss palette
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsPaletteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Ctrl+K / Cmd+K shortcut listener and Escape to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsPaletteOpen(true);
      }
      if (e.key === 'Escape' && isPaletteOpen) {
        setIsPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaletteOpen]);

  // Input change with debounce
  const handleInputChange = (val: string) => {
    setQuery(val);
    if (!isPaletteOpen) setIsPaletteOpen(true);

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 2) {
      debounceTimerRef.current = window.setTimeout(() => {
        onSearch(val.trim(), selectedFilter);
      }, 250);
    }
  };

  // Enter = Normal search execution (User explicit requirement)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPaletteOpen(false);

    if (selectedFilter === 'new_releases' && !query.trim()) {
      onSearch('New Releases', 'new_releases');
      return;
    }
    if (query.trim().length < 2) return;

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    onSearch(query.trim(), selectedFilter);
  };

  const handleSelectDiscovery = (targetQuery: string, filter?: SearchFilterType) => {
    setQuery(targetQuery);
    setIsPaletteOpen(false);
    if (filter) onFilterChange(filter);
    onSearch(targetQuery, filter || selectedFilter);
  };

  const handleFilterClick = (filterId: SearchFilterType) => {
    onFilterChange(filterId);
    if (filterId === 'new_releases') {
      const q = query.trim() || 'New Releases';
      setQuery(q);
      onSearch(q, 'new_releases');
    } else if (query.trim().length >= 2) {
      onSearch(query.trim(), filterId);
    }
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={`pro-creative-search-root ${isFocused || isPaletteOpen ? 'is-search-focused' : ''}`}
    >
      {/* Dynamic Soundwave Ambient Glow Backlight */}
      <div className="search-dynamic-aura-glow" aria-hidden="true" />

      {/* Main Animated Search Bar Capsule */}
      <form onSubmit={handleSubmit} className="creative-search-capsule">
        <div className="search-border-gradient-line" />

        <div className="creative-search-inner">
          {/* Animated Search Orb with Live Frequency Bars */}
          <div className="search-orb-icon-box">
            {isLoading ? (
              <div className="search-active-vu-bars" title="Searching live streams...">
                <span className="s-bar s-1" />
                <span className="s-bar s-2" />
                <span className="s-bar s-3" />
                <span className="s-bar s-4" />
              </div>
            ) : (
              <div className="search-lens-wrapper">
                <Search size={19} className="search-lens-glyph" />
              </div>
            )}
          </div>

          {/* Search Input Container */}
          <div className="search-input-field-wrap">
            <input
              ref={inputRef}
              id="music-search-input"
              type="text"
              className="creative-search-input"
              value={query}
              maxLength={140}
              onFocus={() => {
                setIsFocused(true);
                setIsPaletteOpen(true);
              }}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => handleInputChange(e.target.value)}
              autoComplete="off"
              spellCheck="false"
              placeholder=""
            />

            {/* Rotating Animated Placeholder (fades when typing) */}
            {!query && (
              <div
                className={`rotating-placeholder-track ${isFadingPrompt ? 'is-fading' : ''}`}
                onClick={() => {
                  inputRef.current?.focus();
                  setIsPaletteOpen(true);
                }}
              >
                <span className="rotating-text">{SEARCH_PROMPTS[promptIndex]}</span>
              </div>
            )}
          </div>

          {/* Right Accessories: Clear Button & Keyboard Badge */}
          <div className="search-accessories-right">
            {query && (
              <button
                type="button"
                className="creative-search-clear-btn"
                onClick={handleClear}
                title="Clear input (Esc)"
                aria-label="Clear input"
              >
                <X size={15} />
              </button>
            )}

            <div
              className="creative-shortcut-chip"
              onClick={() => {
                inputRef.current?.focus();
                setIsPaletteOpen(true);
              }}
              title="Shortcut: Press Ctrl + K or click to open palette"
            >
              <span className="key-cap">Ctrl</span>
              <span className="key-cap">K</span>
            </div>
          </div>
        </div>
      </form>

      {/* =========================================================================
          RICH COMMAND PALETTE POPOVER (USER IMAGE 1 REPLICA)
          ========================================================================= */}
      {isPaletteOpen && (
        <div className="search-command-palette-modal" role="dialog" aria-label="Search suggestions">
          {query.trim().length >= 2 ? (
            /* LIVE SEARCH RESULTS COLUMNS (Directly press to play) */
            <div className="palette-live-search-layout">
              {/* Left Column: Top Result Card + Search Info */}
              <div className="palette-top-match-col">
                <div className="palette-col-header">
                  <Compass size={13} className="palette-icon-accent" />
                  <span className="palette-col-title">Top Result</span>
                </div>

                {isLoading && (!liveResults || liveResults.length === 0) ? (
                  <div className="palette-top-skeleton">
                    <div className="skeleton-box skeleton-art" />
                    <div className="skeleton-box skeleton-line" style={{ width: '80%' }} />
                    <div className="skeleton-box skeleton-line" style={{ width: '50%' }} />
                  </div>
                ) : liveResults && liveResults.length > 0 ? (
                  <div
                    className="palette-top-result-card"
                    onClick={() => {
                      if (onSelectTrack) onSelectTrack(liveResults[0]);
                      setIsPaletteOpen(false);
                    }}
                    role="button"
                    tabIndex={0}
                    title={`Play ${liveResults[0].title}`}
                  >
                    <div className="top-result-art-wrap">
                      <img
                        src={liveResults[0].thumbnailUrl || '/assets/default-art.png'}
                        alt={liveResults[0].title}
                        className="top-result-art"
                      />
                      <div className="top-result-play-overlay">
                        <Play size={20} fill="#120e0a" color="#120e0a" style={{ marginLeft: 2 }} />
                      </div>
                    </div>
                    <div className="top-result-info">
                      <span className="top-result-tag">DIRECT MATCH</span>
                      <h3 className="top-result-title" title={liveResults[0].title}>
                        {liveResults[0].title}
                      </h3>
                      <p className="top-result-artist" title={liveResults[0].artist}>
                        {liveResults[0].artist}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="top-result-direct-play-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectTrack) onSelectTrack(liveResults[0]);
                        setIsPaletteOpen(false);
                      }}
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Play Now</span>
                    </button>
                  </div>
                ) : (
                  <div className="palette-no-top-match">
                    <Music size={28} className="empty-glyph" />
                    <span>No matches found</span>
                  </div>
                )}

                {/* Enter hint */}
                <div className="palette-enter-hint-btn" onClick={handleSubmit}>
                  <CornerDownLeft size={13} className="footer-glyph" />
                  <span>Press <b>Enter</b> to view on page</span>
                </div>
              </div>

              {/* Right Column: Search Results List (Directly Pressable) */}
              <div className="palette-tracks-col">
                <div className="palette-col-header">
                  <Music size={13} className="palette-icon-accent" />
                  <span className="palette-col-title">Songs & Tracks</span>
                  {liveResults && liveResults.length > 0 && (
                    <span className="palette-count-pill">{liveResults.length} tracks</span>
                  )}
                </div>

                <div className="palette-track-items-list">
                  {isLoading && (!liveResults || liveResults.length === 0) ? (
                    <div className="palette-tracks-loading">
                      <div className="loading-spinner-dot" />
                      <span>Searching catalog for "{query}"...</span>
                    </div>
                  ) : liveResults && liveResults.length > 0 ? (
                    liveResults.slice(0, 6).map((track, idx) => (
                      <div
                        key={`${track.id}-${idx}`}
                        className="palette-track-row"
                        onClick={() => {
                          if (onSelectTrack) onSelectTrack(track);
                          setIsPaletteOpen(false);
                        }}
                        role="button"
                        tabIndex={0}
                        title={`Play "${track.title}"`}
                      >
                        <div className="palette-track-thumb-wrap">
                          <img
                            src={track.thumbnailUrl || '/assets/default-art.png'}
                            alt={track.title}
                            className="palette-track-thumb"
                            loading="lazy"
                          />
                          <div className="palette-track-hover-play">
                            <Play size={12} fill="#120e0a" color="#120e0a" style={{ marginLeft: 1 }} />
                          </div>
                        </div>

                        <div className="palette-track-details">
                          <span className="palette-track-title" title={track.title}>
                            {track.title}
                          </span>
                          <span className="palette-track-artist" title={track.artist}>
                            {track.artist}
                            {track.album ? ` • ${track.album}` : ''}
                          </span>
                        </div>

                        <div className="palette-track-right-meta">
                          <span className="palette-track-dur">{track.duration || '—'}</span>
                          <button
                            type="button"
                            className="palette-direct-press-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectTrack) onSelectTrack(track);
                              setIsPaletteOpen(false);
                            }}
                            title="Play Track"
                          >
                            <Play size={12} fill="currentColor" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="palette-empty-search-state">
                      <Search size={20} className="empty-glyph" />
                      <span>No matches found. Press Enter to search YouTube Music.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ALGORITHMIC / PERSONALIZED DISCOVERY COLUMNS (When query is empty) */
            <div className="palette-live-search-layout palette-algo-layout">
              {/* Left Column: Algorithmic Category Tabs + Top Spotlight Pick */}
              <div className="palette-top-match-col palette-algo-nav-col">
                <div className="palette-col-header">
                  <Compass size={13} className="palette-icon-accent" />
                  <span className="palette-col-title">Personalized Radar</span>
                </div>

                {/* Algo Mode Switcher Tabs */}
                <div className="palette-algo-tabs-list" role="tablist">
                  <button
                    type="button"
                    className={`palette-algo-tab-btn ${activeAlgoTab === 'for_you' ? 'is-active' : ''}`}
                    onClick={() => setActiveAlgoTab('for_you')}
                  >
                    <Compass size={14} className="tab-glyph" />
                    <span>Made For You</span>
                  </button>

                  <button
                    type="button"
                    className={`palette-algo-tab-btn ${activeAlgoTab === 'recent' ? 'is-active' : ''}`}
                    onClick={() => setActiveAlgoTab('recent')}
                  >
                    <Clock size={14} className="tab-glyph" />
                    <span>Recently Played</span>
                  </button>

                  <button
                    type="button"
                    className={`palette-algo-tab-btn ${activeAlgoTab === 'trending' ? 'is-active' : ''}`}
                    onClick={() => setActiveAlgoTab('trending')}
                  >
                    <Flame size={14} className="tab-glyph" />
                    <span>Trending Hits</span>
                  </button>
                </div>

                {/* Spotlight Track Card for Selected Tab */}
                {activeTracks && activeTracks.length > 0 ? (
                  <div
                    className="palette-top-result-card palette-algo-spotlight-card"
                    onClick={() => {
                      if (onSelectTrack) onSelectTrack(activeTracks[0], activeTracks);
                      setIsPaletteOpen(false);
                    }}
                    role="button"
                    tabIndex={0}
                    title={`Play ${activeTracks[0].title}`}
                  >
                    <div className="top-result-art-wrap">
                      <img
                        src={activeTracks[0].thumbnailUrl || '/assets/default-art.png'}
                        alt={activeTracks[0].title}
                        className="top-result-art"
                      />
                      <div className="top-result-play-overlay">
                        <Play size={20} fill="#120e0a" color="#120e0a" style={{ marginLeft: 2 }} />
                      </div>
                    </div>
                    <div className="top-result-info">
                      <span className="top-result-tag">
                        {activeAlgoTab === 'for_you'
                          ? 'TOP FOR YOU'
                          : activeAlgoTab === 'recent'
                          ? 'RECENT FAVORITE'
                          : 'HOT TRENDING'}
                      </span>
                      <h3 className="top-result-title" title={activeTracks[0].title}>
                        {activeTracks[0].title}
                      </h3>
                      <p className="top-result-artist" title={activeTracks[0].artist}>
                        {activeTracks[0].artist}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="top-result-direct-play-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectTrack) onSelectTrack(activeTracks[0], activeTracks);
                        setIsPaletteOpen(false);
                      }}
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Play Now</span>
                    </button>
                  </div>
                ) : (
                  <div className="palette-no-top-match">
                    <Music size={24} className="empty-glyph" />
                    <span>Loading recommendations...</span>
                  </div>
                )}

                {/* Recent Searches (if available) */}
                {searchHistory && searchHistory.length > 0 && (
                  <div className="palette-recent-history-section">
                    <div className="history-label">
                      <History size={11} />
                      <span>Recent Searches</span>
                    </div>
                    <div className="history-chips-row">
                      {searchHistory.slice(0, 3).map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="history-query-chip"
                          onClick={() => {
                            setQuery(item);
                            setIsPaletteOpen(false);
                            onSearch(item, selectedFilter);
                          }}
                          title={`Search ${item}`}
                        >
                          <span>{item}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Algorithmic Tracks List (Direct Press to Play) */}
              <div className="palette-tracks-col">
                <div className="palette-col-header">
                  <Music size={13} className="palette-icon-accent" />
                  <span className="palette-col-title">
                    {activeAlgoTab === 'for_you'
                      ? 'Recommended For Your Taste'
                      : activeAlgoTab === 'recent'
                      ? 'Recently Played Songs'
                      : 'Live Top Hits'}
                  </span>
                  {activeTracks && activeTracks.length > 0 && (
                    <span className="palette-count-pill">{activeTracks.length} tracks</span>
                  )}
                </div>

                <div className="palette-track-items-list">
                  {activeTracks && activeTracks.length > 0 ? (
                    activeTracks.slice(0, 6).map((track, idx) => (
                      <div
                        key={`${track.id}-${idx}`}
                        className="palette-track-row"
                        onClick={() => {
                          if (onSelectTrack) onSelectTrack(track, activeTracks);
                          setIsPaletteOpen(false);
                        }}
                        role="button"
                        tabIndex={0}
                        title={`Play "${track.title}"`}
                      >
                        <div className="palette-track-thumb-wrap">
                          <img
                            src={track.thumbnailUrl || '/assets/default-art.png'}
                            alt={track.title}
                            className="palette-track-thumb"
                            loading="lazy"
                          />
                          <div className="palette-track-hover-play">
                            <Play size={12} fill="#120e0a" color="#120e0a" style={{ marginLeft: 1 }} />
                          </div>
                        </div>

                        <div className="palette-track-details">
                          <span className="palette-track-title" title={track.title}>
                            {track.title}
                          </span>
                          <span className="palette-track-artist" title={track.artist}>
                            {track.artist}
                            {track.album ? ` • ${track.album}` : ''}
                          </span>
                        </div>

                        <div className="palette-track-right-meta">
                          <span className="palette-track-dur">{track.duration || '—'}</span>
                          <button
                            type="button"
                            className="palette-direct-press-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectTrack) onSelectTrack(track, activeTracks);
                              setIsPaletteOpen(false);
                            }}
                            title="Play Track"
                          >
                            <Play size={12} fill="currentColor" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="palette-tracks-loading">
                      <div className="loading-spinner-dot" />
                      <span>Curating music for you...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SIMPLE MOBILE SEARCH CATALOG (SPOTIFY MOBILE STYLE - MOBILE ONLY)
          ========================================================================= */}
      <div className="mobile-search-catalog">
        {!query.trim() ? (
          <div className="mobile-browse-section">
            {searchHistory && searchHistory.length > 0 && (
              <div className="mobile-recent-searches">
                <span className="mobile-subheading">Recent Searches</span>
                <div className="mobile-recent-chips">
                  {searchHistory.slice(0, 5).map((term, i) => (
                    <button
                      key={i}
                      type="button"
                      className="mobile-recent-chip"
                      onClick={() => {
                        setQuery(term);
                        onSearch(term, selectedFilter);
                      }}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <h2 className="mobile-browse-title">Browse all</h2>
            <div className="mobile-category-grid">
              {MOBILE_BROWSE_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  className="mobile-category-card"
                  style={{ backgroundColor: cat.color }}
                  onClick={() => {
                    setQuery(cat.name);
                    onSearch(cat.name, 'songs');
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="cat-card-title">{cat.name}</span>
                  <span className="cat-card-icon">{cat.icon}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mobile-live-results-section">
            <span className="mobile-subheading">Top Results for "{query}"</span>
            <div className="mobile-live-tracks-list">
              {liveResults && liveResults.length > 0 ? (
                liveResults.map((track, idx) => (
                  <div
                    key={`${track.id}-${idx}`}
                    className="mobile-track-result-item"
                    onClick={() => onSelectTrack && onSelectTrack(track, liveResults)}
                  >
                    <img
                      src={track.thumbnailUrl || '/assets/default-art.png'}
                      alt={track.title}
                      className="mobile-track-art"
                    />
                    <div className="mobile-track-meta">
                      <span className="mobile-track-title">{track.title}</span>
                      <span className="mobile-track-artist">
                        {track.artist} {track.duration ? `• ${track.duration}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="mobile-track-play-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectTrack) onSelectTrack(track, liveResults);
                      }}
                      aria-label="Play track"
                    >
                      <Play size={14} fill="currentColor" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="mobile-search-loading">
                  <span>Searching catalog for "{query}"...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
