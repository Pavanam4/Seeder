import React from 'react';
import type { MusicTrack } from '../types';
import {
  Play,
  Heart,
  Plus,
  Clock3,
  Music,
  Compass,
  ArrowRight,
  Flame,
  Radio,
} from 'lucide-react';

interface TrackListProps {
  tracks: MusicTrack[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectTrack: (track: MusicTrack) => void;
  activeTrackId?: string;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelectSuggestion: (query: string) => void;
  query: string;
  likedTrackIds?: Set<string>;
  onToggleLike?: (track: MusicTrack) => void;
  onOpenAddToPlaylist?: (track: MusicTrack) => void;
}

interface CategoryCard {
  id: string;
  name: string;
  subtitle: string;
  query: string;
  tag: string;
  imageUrl: string;
  accent: string;
}

const QUICK_EXPLORE_CHIPS = [
  { label: '🔥 Top Billboard Hits', query: 'Top Billboard Hits' },
  { label: '☕ Chillhop & Coffee', query: 'Lofi Coffee Beats' },
  { label: '🌴 Malayalam Hits', query: 'Latest Malayalam Songs' },
  { label: '⚡ Synthwave Outrun', query: 'Synthwave 80s Retro' },
  { label: '🎧 Tamil Hits', query: 'Latest Tamil Hit Songs' },
  { label: '💪 Workout EDM', query: 'High Energy Gym EDM' },
  { label: '🌙 Late Night Drive', query: 'Late Night Midnight Drive' },
];

const BROWSE_CATEGORIES: CategoryCard[] = [
  {
    id: 'lofi',
    name: 'Lo-Fi Chill & Beats',
    subtitle: 'Relaxing lo-fi beats, ambient coffee rhythms & study flow',
    query: 'Lofi Chill Beats',
    tag: 'Chill',
    imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
    accent: '#10b981',
  },
  {
    id: 'synthwave',
    name: 'Synthwave & Retrosynth',
    subtitle: 'Outrun neon, 80s nostalgic synths & cyber night drives',
    query: 'Synthwave Outrun',
    tag: 'Synth',
    imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
    accent: '#8b5cf6',
  },
  {
    id: 'electronic',
    name: 'Electronic & Dance',
    subtitle: 'High-octane club bangers, bass drops & festival mainstages',
    query: 'Electronic Dance Music',
    tag: 'Dance',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    accent: '#3b82f6',
  },
  {
    id: 'ambient',
    name: 'Deep Focus & Ambient',
    subtitle: 'Calming soundscapes, theta brainwaves & distraction-free audio',
    query: 'Ambient Deep Focus',
    tag: 'Focus',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    accent: '#64748b',
  },
  {
    id: 'pop',
    name: 'Pop Hits & Charts',
    subtitle: 'Global chart leaders, trending virals & radio favorites',
    query: 'Top Pop Hits',
    tag: 'Top Hits',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    accent: '#ec4899',
  },
  {
    id: 'hiphop',
    name: 'Hip-Hop & Urban',
    subtitle: 'Heavy 808s, lyrical rap, modern trap & underground cuts',
    query: 'Hip Hop Beats',
    tag: 'Urban',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    accent: '#f59e0b',
  },
  {
    id: 'rock',
    name: 'Rock & Alternative',
    subtitle: 'Overdriven guitars, anthemic drums & raw alternative tracks',
    query: 'Alternative Rock',
    tag: 'Rock',
    imageUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=600&q=80',
    accent: '#ef4444',
  },
  {
    id: 'acoustic',
    name: 'Acoustic & Indie',
    subtitle: 'Intimate fingerstyle melodies, warm vocals & storytelling',
    query: 'Indie Acoustic',
    tag: 'Acoustic',
    imageUrl: 'https://images.unsplash.com/photo-1445985543469-433ecdd62977?auto=format&fit=crop&w=600&q=80',
    accent: '#14b8a6',
  },
  {
    id: 'malayalam',
    name: 'Malayalam Melodies',
    subtitle: 'Sushin Shyam, Deepak Dev & soul-stirring Kerala playback hits',
    query: 'Malayalam Hit Songs',
    tag: 'Regional',
    imageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80',
    accent: '#06b6d4',
  },
  {
    id: 'nightdrive',
    name: 'Late Night Midnight Drive',
    subtitle: 'Nocturnal highways, dark synth pulses & midnight headlights',
    query: 'Late Night Midnight Drive',
    tag: 'Night',
    imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=600&q=80',
    accent: '#d97706',
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
}) => {
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

  // Empty State before search or when query is empty: Rich Browse Categories Hub
  if (tracks.length === 0 && !query.trim()) {
    return (
      <div className="search-explore-genres-section">
        {/* Section Header */}
        <div className="explore-genres-header">
          <div className="explore-header-left">
            <div className="explore-header-icon-box">
              <Compass size={22} className="explore-header-icon" />
            </div>
            <div>
              <h2 className="explore-genres-title">Browse Categories</h2>
              <p className="explore-genres-sub">
                Explore handpicked soundscapes, trending genres, and atmospheric radio stations
              </p>
            </div>
          </div>
        </div>

        {/* Quick Mood Launcher Chips Strip */}
        <div className="explore-mood-chips-strip" role="navigation" aria-label="Quick mood shortcuts">
          {QUICK_EXPLORE_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className="explore-mood-chip-btn"
              onClick={() => onSelectSuggestion(chip.query)}
              title={`Explore ${chip.query}`}
            >
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Rich Categories Grid */}
        <div className="explore-genres-grid">
          {BROWSE_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="genre-tile-card"
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
              {/* Photo Artwork Background */}
              <div
                className="genre-tile-artwork-bg"
                style={{ backgroundImage: `url(${cat.imageUrl})` }}
              />

              {/* Atmospheric Dark Gradient Overlay */}
              <div className="genre-tile-gradient-overlay" />

              {/* Accent Tag */}
              <span className="genre-tile-tag-badge" style={{ borderColor: `${cat.accent}55` }}>
                {cat.tag}
              </span>

              {/* Title & Description */}
              <div className="genre-tile-content">
                <h3 className="genre-tile-name">{cat.name}</h3>
                <p className="genre-tile-sub">{cat.subtitle}</p>
              </div>

              {/* Hover Floating Play Button */}
              <button
                type="button"
                className="genre-tile-hover-play-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSuggestion(cat.query);
                }}
                title={`Play ${cat.name}`}
                aria-label={`Play ${cat.name}`}
              >
                <Play size={18} fill="#120e0a" color="#120e0a" style={{ marginLeft: 2 }} />
              </button>
            </div>
          ))}
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
