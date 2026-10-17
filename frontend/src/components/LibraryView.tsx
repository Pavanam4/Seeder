import React, { useState, useMemo } from 'react';
import {
  Heart,
  Plus,
  Play,
  Pause,
  Search,
  X,
  Pin,
  ListMusic,
  Sparkles,
} from 'lucide-react';
import type { Playlist, MusicTrack } from '../types';

interface LibraryViewProps {
  playlists: Playlist[];
  likedTracks: MusicTrack[];
  onOpenPlaylist: (playlistId: string) => void;
  onOpenLiked: () => void;
  onPlayPlaylist: (playlist: Playlist, startIndex?: number) => void;
  onPlayTrack: (track: MusicTrack, queue?: MusicTrack[]) => void;
  onOpenCreateModal: () => void;
  onDeletePlaylist: (id: string) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  playlists,
  likedTracks,
  onOpenPlaylist,
  onOpenLiked,
  onPlayPlaylist,
  onOpenCreateModal,
  onDeletePlaylist,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'playlists' | 'liked'>('all');

  const filteredPlaylists = useMemo(() => {
    if (!filterQuery.trim()) return playlists;
    const q = filterQuery.toLowerCase().trim();
    return playlists.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [playlists, filterQuery]);

  const showLikedCard =
    activeCategory === 'all' || activeCategory === 'liked';
  const showPlaylists =
    activeCategory === 'all' || activeCategory === 'playlists';

  const matchesLiked =
    !filterQuery.trim() ||
    'liked songs'.includes(filterQuery.toLowerCase()) ||
    likedTracks.some(
      (t) =>
        t.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
        t.artist.toLowerCase().includes(filterQuery.toLowerCase())
    );

  return (
    <div className="mobile-library-view-container">
      {/* Library Top Header */}
      <div className="library-view-header">
        <div className="library-title-group">
          <div className="library-icon-badge">
            <ListMusic size={22} className="library-main-icon" />
          </div>
          <div>
            <h1 className="library-heading">Your Library</h1>
            <p className="library-subheading">
              {playlists.length + 1} collections • {likedTracks.length} liked songs
            </p>
          </div>
        </div>

        <button
          type="button"
          className="library-new-playlist-btn"
          onClick={onOpenCreateModal}
          title="Create New Playlist"
          aria-label="Create New Playlist"
        >
          <Plus size={18} />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Filter and Category Pills */}
      <div className="library-filter-toolbar">
        <div className="library-category-chips">
          <button
            type="button"
            className={`lib-chip ${activeCategory === 'all' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`lib-chip ${activeCategory === 'playlists' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('playlists')}
          >
            Playlists ({playlists.length})
          </button>
          <button
            type="button"
            className={`lib-chip ${activeCategory === 'liked' ? 'is-active' : ''}`}
            onClick={() => setActiveCategory('liked')}
          >
            Liked Songs
          </button>
        </div>

        {/* Search within Library */}
        <div className="library-search-box">
          <Search size={15} className="lib-search-icon" />
          <input
            type="text"
            className="lib-search-input"
            placeholder="Search in your library..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
          {filterQuery && (
            <button
              type="button"
              className="lib-search-clear"
              onClick={() => setFilterQuery('')}
              aria-label="Clear filter"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Collections Grid / List */}
      <div className="library-items-grid">
        {/* Pinned Liked Songs Card */}
        {showLikedCard && matchesLiked && (
          <div
            className="library-collection-card liked-songs-card"
            onClick={onOpenLiked}
            role="button"
            tabIndex={0}
          >
            <div className="lib-card-art liked-gradient-art">
              <Heart size={30} fill="#ffffff" color="#ffffff" className="liked-art-heart" />
              <div className="lib-pin-tag" title="Pinned to top">
                <Pin size={11} />
              </div>
            </div>

            <div className="lib-card-info">
              <div className="lib-card-title-row">
                <span className="lib-card-title">Liked Songs</span>
                <span className="lib-pinned-badge">Pinned</span>
              </div>
              <p className="lib-card-meta">
                Auto Playlist • {likedTracks.length} {likedTracks.length === 1 ? 'song' : 'songs'}
              </p>
            </div>

            <div className="lib-card-actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="lib-quick-play-btn"
                onClick={() => {
                  if (likedTracks.length > 0) {
                    onPlayPlaylist(
                      {
                        id: 'playlist-liked-songs',
                        name: 'Liked Songs',
                        description: 'Your favorite tracks saved with love.',
                        coverUrl:
                          'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=60',
                        createdAt: new Date().toISOString(),
                        isCustom: false,
                        tracks: likedTracks,
                      },
                      0
                    );
                  }
                }}
                disabled={likedTracks.length === 0}
                title="Play Liked Songs"
                aria-label="Play Liked Songs"
              >
                <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
              </button>
            </div>
          </div>
        )}

        {/* User Playlists */}
        {showPlaylists &&
          filteredPlaylists.map((pl) => {
            const hasCover = Boolean(pl.coverUrl);
            return (
              <div
                key={pl.id}
                className="library-collection-card"
                onClick={() => onOpenPlaylist(pl.id)}
                role="button"
                tabIndex={0}
              >
                <div className="lib-card-art custom-playlist-art">
                  {hasCover ? (
                    <img
                      src={pl.coverUrl}
                      alt={pl.name}
                      className="lib-cover-img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="lib-cover-fallback">
                      <ListMusic size={26} color="var(--accent-primary)" />
                    </div>
                  )}
                </div>

                <div className="lib-card-info">
                  <span className="lib-card-title">{pl.name}</span>
                  <p className="lib-card-meta">
                    Playlist • {pl.tracks.length} {pl.tracks.length === 1 ? 'track' : 'tracks'}
                  </p>
                </div>

                <div className="lib-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="lib-quick-play-btn"
                    onClick={() => {
                      if (pl.tracks.length > 0) {
                        onPlayPlaylist(pl, 0);
                      } else {
                        onOpenPlaylist(pl.id);
                      }
                    }}
                    title={pl.tracks.length > 0 ? `Play ${pl.name}` : `Open ${pl.name}`}
                    aria-label={`Play ${pl.name}`}
                  >
                    <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
                  </button>
                </div>
              </div>
            );
          })}

        {/* Empty Search State */}
        {showPlaylists && filteredPlaylists.length === 0 && filterQuery && (
          <div className="library-empty-state">
            <Search size={32} className="empty-search-icon" />
            <p className="empty-text">No playlists match "{filterQuery}"</p>
            <button
              type="button"
              className="lib-chip is-active"
              onClick={() => setFilterQuery('')}
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* No Playlists Yet Callout */}
        {playlists.length === 0 && !filterQuery && (
          <div className="library-create-callout">
            <Sparkles size={28} className="create-callout-icon" />
            <h3 className="callout-title">Create your first playlist</h3>
            <p className="callout-desc">
              Organize your favorite songs, YouTube music videos, and custom collections.
            </p>
            <button
              type="button"
              className="library-callout-create-btn"
              onClick={onOpenCreateModal}
            >
              <Plus size={16} />
              <span>Create Playlist</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
