import React, { useMemo } from 'react';
import type { MusicTrack } from '../types';
import {
  Play,
  Heart,
  Plus,
  Clock3,
  Music,
  Compass,
  ArrowRight,
  History,
  TrendingUp,
} from 'lucide-react';
import { getUserTasteProfile } from '../services/storage';

interface TrackListProps {
  tracks: MusicTrack[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectTrack: (track: MusicTrack, queue?: MusicTrack[]) => void;
  activeTrackId?: string;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelectSuggestion: (query: string) => void;
  query: string;
  likedTrackIds?: Set<string>;
  onToggleLike?: (track: MusicTrack) => void;
  onOpenAddToPlaylist?: (track: MusicTrack) => void;
  recentTracks?: MusicTrack[];
  likedTracks?: MusicTrack[];
  algorithmicTracks?: MusicTrack[];
  searchHistory?: string[];
  onClearHistory?: () => void;
}

interface SpotifyGenreTile {
  id: string;
  name: string;
  query: string;
  color: string;
  tag?: string;
  artUrl: string;
}

const SPOTIFY_GENRE_TILES: SpotifyGenreTile[] = [
  {
    id: 'malayalam',
    name: 'Malayalam',
    query: 'Malayalam Hit Songs',
    color: '#27856a',
    tag: 'Top Pick',
    artUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'trending',
    name: 'Charts & Viral',
    query: 'Top Trending Songs Charts',
    color: '#8400e7',
    tag: 'Top 50',
    artUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'tamil',
    name: 'Tamil Hits',
    query: 'Tamil Hit Songs Anirudh',
    color: '#e8115b',
    tag: 'Popular',
    artUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'bollywood',
    name: 'Bollywood & Hindi',
    query: 'Trending Hindi Bollywood Songs',
    color: '#ba5d07',
    tag: 'Trending',
    artUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'pop',
    name: 'Global Pop',
    query: 'Top Pop Music Hits',
    color: '#148a08',
    tag: 'Hits',
    artUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'hiphop',
    name: 'Hip-Hop & Rap',
    query: 'Hip Hop Rap Beats',
    color: '#e13300',
    tag: 'Urban',
    artUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'lofi',
    name: 'Lo-Fi & Chill',
    query: 'Lofi Chill Study Beats',
    color: '#477d95',
    tag: 'Chill',
    artUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'dance',
    name: 'Dance / EDM',
    query: 'Electronic Dance Music Festival',
    color: '#006450',
    tag: 'Energy',
    artUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'rock',
    name: 'Rock & Alt',
    query: 'Alternative Rock Hits',
    color: '#e91429',
    tag: 'Anthem',
    artUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'indie',
    name: 'Indie & Acoustic',
    query: 'Indie Acoustic Folk Songs',
    color: '#608108',
    tag: 'Acoustic',
    artUrl: 'https://images.unsplash.com/photo-1445985543469-433ecdd62977?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'focus',
    name: 'Deep Focus',
    query: 'Deep Focus Ambient Study Audio',
    color: '#503750',
    tag: 'Focus',
    artUrl: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'nightdrive',
    name: 'Late Night Drive',
    query: 'Late Night Midnight Drive Synth',
    color: '#1e3264',
    tag: 'Midnight',
    artUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'workout',
    name: 'Workout',
    query: 'High Energy Gym Workout Music',
    color: '#777777',
    tag: 'Gym',
    artUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=240&auto=format&fit=crop&q=80',
  },
  {
    id: 'punjabi',
    name: 'Punjabi Hot',
    query: 'Punjabi Hits Top Songs',
    color: '#bc5900',
    tag: 'Beats',
    artUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=240&auto=format&fit=crop&q=80',
  },
];

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  isLoading,
  isLoadingMore,
  error,
  onRetry,
  onSelectTrack,
  activeTrackId,
  hasMore,
  onLoadMore,
  onSelectSuggestion,
  query,
  likedTrackIds = new Set(),
  onToggleLike,
  onOpenAddToPlaylist,
  recentTracks = [],
  likedTracks = [],
  algorithmicTracks = [],
  searchHistory = [],
  onClearHistory,
}) => {
  // Dynamic taste profile derived from user's listening history and liked tracks
  const tasteProfile = useMemo(() => {
    return getUserTasteProfile(likedTracks, recentTracks);
  }, [likedTracks, recentTracks]);

  // Algorithmic taste chips (user's real frequent artists & genres)
  const algoTasteChips = useMemo(() => {
    const chips: string[] = [];
    if (tasteProfile.length > 0) {
      for (const item of tasteProfile.slice(0, 4)) {
        chips.push(item);
      }
    }
    const fallbackMoods = [
      'Top Billboard Hits',
      'Chillhop Beats',
      'Malayalam Melodies',
      'Late Night Drive',
      'Tamil Hits',
      'Workout EDM',
    ];
    for (const m of fallbackMoods) {
      if (!chips.includes(m) && chips.length < 6) {
        chips.push(m);
      }
    }
    return chips;
  }, [tasteProfile]);

  // Algorithmic quick picks (playable recommendation tracks)
  const quickPickTracks = useMemo(() => {
    const combined: MusicTrack[] = [];
    const seen = new Set<string>();

    for (const t of algorithmicTracks) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        combined.push(t);
      }
    }
    for (const t of recentTracks) {
      if (!seen.has(t.id) && combined.length < 6) {
        seen.add(t.id);
        combined.push(t);
      }
    }
    return combined.slice(0, 6);
  }, [algorithmicTracks, recentTracks]);

  // Loading State
  if (isLoading && tracks.length === 0) {
    return (
      <div className="pro-search-loading-state">
        <div className="audio-pulse-loader">
          <span className="pulse-dot dot-1" />
          <span className="pulse-dot dot-2" />
          <span className="pulse-dot dot-3" />
        </div>
        <h3 className="loading-state-title">Finding tracks for you...</h3>
        <p className="loading-state-sub">Exploring the catalog</p>
      </div>
    );
  }

  // Error State
  if (error && tracks.length === 0) {
    return (
      <div className="pro-search-error-state">
        <div className="error-icon-box">
          <Music size={32} />
        </div>
        <h3 className="error-state-title">Unable to complete search</h3>
        <p className="error-state-desc">{error}</p>
        <button type="button" className="retry-search-btn" onClick={onRetry}>
          Try Again
        </button>
      </div>
    );
  }

  // Empty State before search: High-End Algorithm & Spotify-Style Browse Hub
  if (tracks.length === 0 && !query.trim()) {
    const hasListeningData = quickPickTracks.length > 0 || algoTasteChips.length > 0;

    return (
      <div className="search-explore-genres-section">
        {/* 1. Algorithmic Hub Section: Based On Your Listening */}
        {hasListeningData && (
          <div className="search-algo-hub-section">
            <div className="search-algo-header">
              <div className="search-algo-title-wrap">
                <Music size={18} className="search-algo-title-icon" />
                <div>
                  <h2 className="search-algo-title">Based on your listening</h2>
                  <p className="search-algo-sub">
                    Personalized genres & quick picks based on your recent activity
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Algorithmic Taste Chips */}
            {algoTasteChips.length > 0 && (
              <div className="search-algo-chips-row">
                {algoTasteChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="search-algo-chip"
                    onClick={() => onSelectSuggestion(chip)}
                    title={`Explore ${chip}`}
                  >
                    <span>{chip}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Algorithmic Quick Picks Grid: 6 Live Playable Tracks */}
            {quickPickTracks.length > 0 && (
              <div className="search-quick-picks-grid">
                {quickPickTracks.map((track) => (
                  <div
                    key={track.id}
                    className="search-quick-pick-card"
                    onClick={() => onSelectTrack(track, quickPickTracks)}
                    role="button"
                    tabIndex={0}
                    title={`Play ${track.title}`}
                  >
                    <div className="quick-pick-thumb-wrap">
                      <img
                        src={track.thumbnailUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160&auto=format&fit=crop&q=60'}
                        alt={track.title}
                        className="quick-pick-img"
                        loading="lazy"
                      />
                      <div className="quick-pick-play-overlay">
                        <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
                      </div>
                    </div>
                    <div className="quick-pick-details">
                      <span className="quick-pick-title">{track.title}</span>
                      <span className="quick-pick-artist">{track.artist || 'Unknown Artist'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Recent Searches (if any) */}
        {searchHistory && searchHistory.length > 0 && (
          <div className="search-history-hub-section">
            <div className="search-section-mini-header">
              <div className="search-mini-header-left">
                <History size={16} className="text-muted" />
                <span className="search-section-mini-title">Recent Searches</span>
              </div>
              {onClearHistory && (
                <button
                  type="button"
                  className="search-clear-history-btn"
                  onClick={onClearHistory}
                >
                  Clear history
                </button>
              )}
            </div>
            <div className="search-history-chips-row">
              {searchHistory.slice(0, 8).map((term) => (
                <button
                  key={term}
                  type="button"
                  className="search-history-chip"
                  onClick={() => onSelectSuggestion(term)}
                  title={`Search for "${term}"`}
                >
                  <History size={12} className="history-chip-icon" />
                  <span>{term}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. Browse All Categories (Spotify Vibrant Colored Solid Tiles) */}
        <div className="search-browse-section">
          <div className="search-section-mini-header">
            <span className="search-section-mini-title">Browse All</span>
          </div>

          <div className="spotify-browse-grid">
            {SPOTIFY_GENRE_TILES.map((cat) => (
              <div
                key={cat.id}
                className="spotify-genre-card"
                style={{ backgroundColor: cat.color }}
                onClick={() => onSelectSuggestion(cat.query)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSuggestion(cat.query);
                  }
                }}
                title={`Explore ${cat.name}`}
              >
                <div className="spotify-genre-title-wrap">
                  <h3 className="spotify-genre-title">{cat.name}</h3>
                  {cat.tag && <span className="spotify-genre-tag">{cat.tag}</span>}
                </div>

                <div className="spotify-genre-art-container">
                  <img
                    src={cat.artUrl}
                    alt={cat.name}
                    className="spotify-genre-artwork"
                    loading="lazy"
                  />
                </div>

                <button
                  type="button"
                  className="spotify-genre-play-bubble"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSuggestion(cat.query);
                  }}
                  title={`Play ${cat.name}`}
                  aria-label={`Play ${cat.name}`}
                >
                  <Play size={18} fill="#000000" color="#000000" style={{ marginLeft: 2 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty State: No results found for query
  if (tracks.length === 0) {
    return (
      <div className="pro-search-no-results">
        <h3 className="no-results-title">No results found for &ldquo;{query}&rdquo;</h3>
        <p className="no-results-sub">
          Please make sure your words are spelled correctly or try using less or different keywords.
        </p>
      </div>
    );
  }

  // Top result and subsequent tracks
  const topResult = tracks[0];
  const topSongs = tracks.slice(0, 4);

  return (
    <div className="pro-search-results-container">
      {/* Spotify Dual Top-Result Hero Layout */}
      <div className="search-top-overview-row">
        {/* Top Result Card (Left) */}
        <div className="top-result-card" onClick={() => onSelectTrack(topResult)}>
          <span className="top-result-section-label">Top Result</span>
          <div className="top-result-inner">
            <img
              src={topResult.thumbnailUrl}
              alt={topResult.title}
              className="top-result-artwork"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60';
              }}
            />
            <h2 className="top-result-title" title={topResult.title}>
              {topResult.title}
            </h2>
            <div className="top-result-meta-line">
              <span className="top-result-type-tag">Song</span>
              <span className="top-result-artist">{topResult.artist}</span>
            </div>

            <button
              type="button"
              className="top-result-play-circle"
              onClick={(e) => {
                e.stopPropagation();
                onSelectTrack(topResult);
              }}
              title={`Play ${topResult.title}`}
            >
              <Play size={22} fill="#05240c" color="#05240c" style={{ marginLeft: 2 }} />
            </button>
          </div>
        </div>

        {/* Songs Quick List (Right) */}
        <div className="top-songs-column">
          <span className="top-songs-section-label">Songs</span>
          <div className="top-songs-list">
            {topSongs.map((track) => {
              const isPlayingThis = track.id === activeTrackId;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={`top-song-${track.id}`}
                  className={`top-song-row ${isPlayingThis ? 'is-playing' : ''}`}
                  onClick={() => onSelectTrack(track)}
                >
                  <div className="top-song-thumb-wrap">
                    <img
                      src={track.thumbnailUrl}
                      alt={track.title}
                      className="top-song-thumb"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60';
                      }}
                    />
                    <div className="top-song-hover-play">
                      <Play size={14} fill="#fff" color="#fff" />
                    </div>
                  </div>

                  <div className="top-song-info">
                    <span className="top-song-name" title={track.title}>
                      {track.title}
                    </span>
                    <span className="top-song-artist" title={track.artist}>
                      {track.artist}
                    </span>
                  </div>

                  {onToggleLike && (
                    <button
                      type="button"
                      className={`row-like-btn ${isLiked ? 'is-liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(track);
                      }}
                      title={isLiked ? 'Remove from Liked' : 'Like'}
                    >
                      <Heart size={15} fill={isLiked ? 'var(--accent-primary)' : 'none'} />
                    </button>
                  )}

                  <span className="top-song-duration">{track.duration || '--:--'}</span>

                  {onOpenAddToPlaylist && (
                    <button
                      type="button"
                      className="row-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAddToPlaylist(track);
                      }}
                      title="Add to Playlist"
                    >
                      <Plus size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comprehensive Track List Table */}
      <div className="search-full-table-section">
        <div className="search-table-header-title">
          <h3>All Results</h3>
        </div>

        <div className="pro-tracks-table">
          <div className="table-header-row">
            <span className="th-cell th-num">#</span>
            <span className="th-cell th-title">Title</span>
            <span className="th-cell th-album">Album</span>
            <span className="th-cell th-time">
              <Clock3 size={15} />
            </span>
            <span className="th-cell th-more" />
          </div>

          <div className="table-body">
            {tracks.map((track, idx) => {
              const isPlayingThis = track.id === activeTrackId;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={`all-track-${track.id}-${idx}`}
                  className={`table-track-row ${isPlayingThis ? 'is-playing' : ''}`}
                  onClick={() => onSelectTrack(track)}
                >
                  <div className="td-cell td-num">
                    <span className="row-index-num">{idx + 1}</span>
                    <button
                      type="button"
                      className="row-play-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTrack(track);
                      }}
                      title={`Play ${track.title}`}
                    >
                      <Play size={13} fill="currentColor" />
                    </button>
                  </div>

                  <div className="td-cell td-title">
                    <img
                      src={track.thumbnailUrl}
                      alt={track.title}
                      className="row-artwork"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60';
                      }}
                    />
                    <div className="row-title-meta">
                      <span className="row-track-title" title={track.title}>
                        {track.title}
                      </span>
                      <span className="row-track-artist" title={track.artist}>
                        {track.artist}
                      </span>
                    </div>
                  </div>

                  <div className="td-cell td-album">
                    <span className="row-album-text" title={track.album || 'Single'}>
                      {track.album || 'Single'}
                    </span>
                  </div>

                  <div className="td-cell td-time">
                    <span className="row-duration-text">{track.duration || '--:--'}</span>
                  </div>

                  <div className="td-cell td-actions">
                    {onToggleLike && (
                      <button
                        type="button"
                        className={`table-action-icon-btn ${isLiked ? 'is-liked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLike(track);
                        }}
                        title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                      >
                        <Heart size={16} fill={isLiked ? 'var(--accent-primary)' : 'none'} />
                      </button>
                    )}

                    {onOpenAddToPlaylist && (
                      <button
                        type="button"
                        className="table-action-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAddToPlaylist(track);
                        }}
                        title="Add to Playlist"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="load-more-center-wrap">
            <button
              type="button"
              className="pro-load-more-btn"
              onClick={onLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <span>Loading more tracks...</span>
              ) : (
                <>
                  <span>Load More Results</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
