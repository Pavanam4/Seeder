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
  Link2,
  Trash2,
  MoreVertical,
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
  onOpenSpotifyImport?: () => void;
  onDeletePlaylist: (id: string) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  pinnedPlaylistIds: Set<string>;
  onTogglePinPlaylist: (id: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  playlists,
  likedTracks,
  onOpenPlaylist,
  onOpenLiked,
  onPlayPlaylist,
  onOpenCreateModal,
  onOpenSpotifyImport,
  onDeletePlaylist,
  pinnedPlaylistIds,
  onTogglePinPlaylist,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'playlists' | 'liked'>('all');
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    playlist: Playlist;
  } | null>(null);

  const contextMenuRef = React.useRef<HTMLDivElement>(null);

  // Close context menu on global click
  React.useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleCloseMenu);
      window.addEventListener('scroll', handleCloseMenu, true);
    }
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('scroll', handleCloseMenu, true);
    };
  }, [contextMenu]);

  const handlePlaylistContextMenu = (e: React.MouseEvent, pl: Playlist) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 150);
    setContextMenu({ visible: true, x, y, playlist: pl });
  };

  // Sort playlists: Pinned first -> User created / imported on top -> System auto-mixes
  const sortedPlaylists = useMemo(() => {
    return [...playlists].sort((a, b) => {
      const aPinned = pinnedPlaylistIds.has(a.id);
      const bPinned = pinnedPlaylistIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // User created & imported playlists come before default auto-mixes
      if (a.isCustom && !b.isCustom) return -1;
      if (!a.isCustom && b.isCustom) return 1;

      return 0;
    });
  }, [playlists, pinnedPlaylistIds]);

  const filteredPlaylists = useMemo(() => {
    if (!filterQuery.trim()) return sortedPlaylists;
    const q = filterQuery.toLowerCase().trim();
    return sortedPlaylists.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [sortedPlaylists, filterQuery]);

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

        <div className="library-header-actions">
          {onOpenSpotifyImport && (
            <button
              type="button"
              className="library-spotify-import-btn"
              onClick={onOpenSpotifyImport}
              title="Import Spotify playlist from link"
              aria-label="Import Spotify"
            >
              <Link2 size={16} />
              <span>Import Spotify</span>
            </button>
          )}

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

        {/* Playlists (Pinned & Custom on Top) */}
        {showPlaylists &&
          filteredPlaylists.map((pl) => {
            const hasCover = Boolean(pl.coverUrl);
            const isPinned = pinnedPlaylistIds.has(pl.id);

            return (
              <div
                key={pl.id}
                className={`library-collection-card ${isPinned ? 'is-pinned-card' : ''}`}
                onClick={() => onOpenPlaylist(pl.id)}
                onContextMenu={(e) => handlePlaylistContextMenu(e, pl)}
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
                  {isPinned && (
                    <div className="lib-pin-tag" title="Pinned to top">
                      <Pin size={11} />
                    </div>
                  )}
                </div>

                <div className="lib-card-info">
                  <div className="lib-card-title-row">
                    <span className="lib-card-title">{pl.name}</span>
                    {isPinned && <span className="lib-pinned-badge">Pinned</span>}
                  </div>
                  <p className="lib-card-meta">
                    {pl.isCustom ? 'Custom Playlist' : 'Playlist'} • {pl.tracks.length} {pl.tracks.length === 1 ? 'track' : 'tracks'}
                  </p>
                </div>

                <div className="lib-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={`lib-card-pin-btn ${isPinned ? 'is-pinned' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePinPlaylist(pl.id);
                    }}
                    title={isPinned ? 'Unpin from top' : 'Pin to top of Library'}
                    aria-label="Pin playlist"
                  >
                    <Pin size={14} />
                  </button>

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

      {/* Right-click Floating Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="library-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="lib-context-header">
            <span className="lib-context-title">{contextMenu.playlist.name}</span>
          </div>

          <button
            type="button"
            className="lib-context-item"
            onClick={() => {
              onTogglePinPlaylist(contextMenu.playlist.id);
              setContextMenu(null);
            }}
          >
            <Pin size={14} className={pinnedPlaylistIds.has(contextMenu.playlist.id) ? 'is-pinned-icon' : ''} />
            <span>
              {pinnedPlaylistIds.has(contextMenu.playlist.id)
                ? 'Unpin from top'
                : 'Pin to top of Library'}
            </span>
          </button>

          <button
            type="button"
            className="lib-context-item"
            onClick={() => {
              onOpenPlaylist(contextMenu.playlist.id);
              setContextMenu(null);
            }}
          >
            <ListMusic size={14} />
            <span>Open playlist</span>
          </button>

          <button
            type="button"
            className="lib-context-item"
            onClick={() => {
              if (contextMenu.playlist.tracks.length > 0) {
                onPlayPlaylist(contextMenu.playlist, 0);
              } else {
                onOpenPlaylist(contextMenu.playlist.id);
              }
              setContextMenu(null);
            }}
          >
            <Play size={14} fill="currentColor" />
            <span>Play playlist</span>
          </button>

          {contextMenu.playlist.isCustom && (
            <>
              <div className="lib-context-divider" />
              <button
                type="button"
                className="lib-context-item is-danger"
                onClick={() => {
                  if (confirm(`Delete playlist "${contextMenu.playlist.name}"?`)) {
                    onDeletePlaylist(contextMenu.playlist.id);
                  }
                  setContextMenu(null);
                }}
              >
                <Trash2 size={14} />
                <span>Delete playlist</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
