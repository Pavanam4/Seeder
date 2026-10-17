import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Trash2,
  Clock3,
  Heart,
  Music,
  Plus,
  Search,
  Sparkles,
  MoreHorizontal,
  ListPlus,
  ListMusic,
  Share2,
  ExternalLink,
  X,
} from 'lucide-react';
import type { Playlist, MusicTrack } from '../types';

interface PlaylistViewProps {
  playlist: Playlist;
  currentTrackId?: string;
  isPlaying: boolean;
  likedTrackIds: Set<string>;
  onPlayPlaylist: (playlist: Playlist, startIndex?: number) => void;
  onPlayTrack: (track: MusicTrack, queue?: MusicTrack[]) => void;
  onToggleLike: (track: MusicTrack) => void;
  onRemoveTrack: (playlistId: string, trackId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onOpenAddToPlaylist: (track: MusicTrack) => void;
  onPlayNext?: (track: MusicTrack) => void;
  onAddToQueue?: (track: MusicTrack) => void;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({
  playlist,
  currentTrackId,
  isPlaying,
  likedTrackIds,
  onPlayPlaylist,
  onPlayTrack,
  onToggleLike,
  onRemoveTrack,
  onDeletePlaylist,
  onOpenAddToPlaylist,
  onPlayNext,
  onAddToQueue,
}) => {
  const [filterText, setFilterText] = useState('');
  const [openMenuTrackId, setOpenMenuTrackId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuTrackId(null);
      }
    };
    if (openMenuTrackId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openMenuTrackId]);

  const isLikedView = playlist.id === 'playlist-liked-songs' || playlist.name === 'Liked Songs';

  // Filter tracks if user is searching within playlist
  const filteredTracks = playlist.tracks.filter((t) => {
    if (!filterText.trim()) return true;
    const query = filterText.toLowerCase();
    return (
      t.title.toLowerCase().includes(query) ||
      t.artist.toLowerCase().includes(query) ||
      (t.album && t.album.toLowerCase().includes(query))
    );
  });

  // Calculate total duration in seconds
  const totalSeconds = playlist.tracks.reduce((acc, t) => acc + (t.durationSeconds || 0), 0);
  const totalMinutes = Math.floor(totalSeconds / 60);

  const isCurrentPlaylistPlaying =
    isPlaying && playlist.tracks.some((t) => t.id === currentTrackId);

  return (
    <div className={`spotify-playlist-view ${isLikedView ? 'is-liked-songs-theme' : ''}`}>
      {/* Hero Header */}
      <div className={`playlist-hero-banner ${isLikedView ? 'liked-hero-banner' : ''}`}>
        <div className="playlist-hero-artwork-wrap">
          {isLikedView ? (
            <div className="liked-hero-heart-artwork">
              <Heart size={84} fill="#ffffff" color="#ffffff" className="liked-heart-glow" />
            </div>
          ) : playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.name} className="playlist-hero-img" />
          ) : (
            <div className="playlist-hero-fallback">
              <Music size={64} />
            </div>
          )}
        </div>

        <div className="playlist-hero-details">
          <span className="playlist-badge">
            {isLikedView ? 'CURATED COLLECTION' : playlist.isCustom ? 'CUSTOM PLAYLIST' : 'CURATED MIX'}
          </span>
          <h1 className="playlist-hero-title">{playlist.name}</h1>
          {playlist.description && (
            <p className="playlist-hero-desc">{playlist.description}</p>
          )}

          <div className="playlist-hero-meta-row">
            <span className="meta-author">
              {isLikedView ? 'Your Library' : 'Music Fetcher'}
            </span>
            <span className="meta-dot">•</span>
            <span className="meta-count">
              {playlist.tracks.length} {playlist.tracks.length === 1 ? 'song' : 'songs'}
            </span>
            {totalMinutes > 0 && (
              <>
                <span className="meta-dot">•</span>
                <span className="meta-duration">about {totalMinutes} min</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar: Play, Search Filter, and Playlist Controls */}
      <div className="playlist-action-bar">
        <div className="action-bar-left">
          <button
            type="button"
            className="playlist-main-play-btn"
            onClick={() => onPlayPlaylist(playlist, 0)}
            disabled={playlist.tracks.length === 0}
            title={isCurrentPlaylistPlaying ? 'Pause' : 'Play playlist'}
          >
            {isCurrentPlaylistPlaying ? (
              <Pause size={24} fill="#05240c" color="#05240c" />
            ) : (
              <Play size={24} fill="#05240c" color="#05240c" style={{ marginLeft: 3 }} />
            )}
          </button>

          {playlist.isCustom && (
            <button
              type="button"
              className="playlist-delete-btn"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
                  onDeletePlaylist(playlist.id);
                }
              }}
              title="Delete this playlist"
            >
              <Trash2 size={17} />
              <span>Delete</span>
            </button>
          )}
        </div>

        {/* Filter within playlist */}
        {playlist.tracks.length > 0 && (
          <div className="playlist-filter-wrap">
            <Search size={15} className="playlist-filter-icon" />
            <input
              type="text"
              className="playlist-filter-input"
              placeholder={isLikedView ? "Filter liked songs..." : "Filter in playlist..."}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            {filterText && (
              <span className="playlist-filter-badge">
                {filteredTracks.length} {filteredTracks.length === 1 ? 'song' : 'songs'}
              </span>
            )}
            {filterText && (
              <button
                type="button"
                className="playlist-filter-clear-btn"
                onClick={() => setFilterText('')}
                aria-label="Clear filter"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Spotify-Grade Track List Table */}
      {filteredTracks.length > 0 ? (
        <div className="playlist-tracks-table">
          <div className="table-header-row">
            <span className="th-col th-index">#</span>
            <span className="th-col th-title">Title</span>
            <span className="th-col th-album">Album</span>
            <span className="th-col th-duration">
              <Clock3 size={15} />
            </span>
            <span className="th-col th-actions"></span>
          </div>

          <div className="table-body">
            {filteredTracks.map((track, idx) => {
              const isCurrent = track.id === currentTrackId;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={`${track.id}-${idx}`}
                  className={`table-track-row ${isCurrent ? 'active-track' : ''}`}
                  onClick={() => onPlayTrack(track, filteredTracks)}
                >
                  {/* Track Index or Play Icon */}
                  <div className="td-col td-index">
                    <span className="index-num">{idx + 1}</span>
                    <button
                      type="button"
                      className="row-hover-play-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTrack(track, filteredTracks);
                      }}
                      title="Play track"
                    >
                      {isCurrent && isPlaying ? (
                        <Pause size={14} fill="currentColor" />
                      ) : (
                        <Play size={14} fill="currentColor" />
                      )}
                    </button>
                  </div>

                  {/* Title & Artist with Album Thumbnail */}
                  <div className="td-col td-title">
                    <img
                      src={track.thumbnailUrl}
                      alt={track.title}
                      className="track-row-thumb"
                    />
                    <div className="track-row-text">
                      <span className={`track-row-title ${isCurrent ? 'text-accent' : ''}`} title={track.title}>
                        {track.title}
                      </span>
                      <span className="track-row-artist" title={track.artist}>
                        {track.artist}
                      </span>
                    </div>
                  </div>

                  {/* Album */}
                  <div className="td-col td-album">
                    <span title={track.album || 'Single'}>{track.album || 'Single'}</span>
                  </div>

                  {/* Duration */}
                  <div className="td-col td-duration">
                    <span>{track.duration || '—'}</span>
                  </div>

                  {/* Actions (Like, 3-dots Management Menu) */}
                  <div className="td-col td-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`row-action-icon ${isLiked ? 'liked' : ''}`}
                      onClick={() => onToggleLike(track)}
                      title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                    >
                      <Heart size={16} fill={isLiked ? 'var(--accent-primary)' : 'none'} />
                    </button>

                    {/* 3-Dots Management Button */}
                    <div
                      className="track-menu-anchor-wrap"
                      ref={openMenuTrackId === track.id ? menuRef : null}
                    >
                      <button
                        type="button"
                        className={`row-action-icon menu-dots-btn ${openMenuTrackId === track.id ? 'is-active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuTrackId((prev) => (prev === track.id ? null : track.id));
                        }}
                        title="More options"
                        aria-label="More options"
                      >
                        <MoreHorizontal size={17} />
                      </button>

                      {openMenuTrackId === track.id && (
                        <div className="track-context-menu-popover" role="menu">
                          <button
                            type="button"
                            className="context-menu-item"
                            onClick={() => {
                              onPlayNext?.(track);
                              setOpenMenuTrackId(null);
                            }}
                          >
                            <ListPlus size={15} className="context-menu-glyph" />
                            <span>Play Next</span>
                          </button>

                          <button
                            type="button"
                            className="context-menu-item"
                            onClick={() => {
                              onAddToQueue?.(track);
                              setOpenMenuTrackId(null);
                            }}
                          >
                            <ListMusic size={15} className="context-menu-glyph" />
                            <span>Add to Queue</span>
                          </button>

                          <button
                            type="button"
                            className="context-menu-item"
                            onClick={() => {
                              onOpenAddToPlaylist(track);
                              setOpenMenuTrackId(null);
                            }}
                          >
                            <Plus size={15} className="context-menu-glyph" />
                            <span>Add to Playlist...</span>
                          </button>

                          <div className="context-menu-divider" />

                          <button
                            type="button"
                            className="context-menu-item"
                            onClick={() => {
                              onToggleLike(track);
                              setOpenMenuTrackId(null);
                            }}
                          >
                            <Heart size={15} className="context-menu-glyph" fill={isLiked ? 'currentColor' : 'none'} />
                            <span>{isLiked ? 'Remove from Liked' : 'Save to Liked Songs'}</span>
                          </button>

                          {playlist.isCustom && (
                            <button
                              type="button"
                              className="context-menu-item danger-item"
                              onClick={() => {
                                onRemoveTrack(playlist.id, track.id);
                                setOpenMenuTrackId(null);
                              }}
                            >
                              <Trash2 size={15} className="context-menu-glyph" />
                              <span>Remove from Playlist</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="context-menu-item"
                            onClick={() => {
                              if (track.youtubeUrl) {
                                navigator.clipboard?.writeText(track.youtubeUrl);
                              }
                              setOpenMenuTrackId(null);
                            }}
                          >
                            <Share2 size={15} className="context-menu-glyph" />
                            <span>Copy Link</span>
                          </button>

                          <button
                            type="button"
                            className="context-menu-item"
                            onClick={() => {
                              if (track.youtubeUrl) {
                                window.open(track.youtubeUrl, '_blank', 'noopener,noreferrer');
                              }
                              setOpenMenuTrackId(null);
                            }}
                          >
                            <ExternalLink size={15} className="context-menu-glyph" />
                            <span>Open on YouTube</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : playlist.tracks.length > 0 ? (
        <div className="playlist-empty-box">
          <Search size={36} className="empty-icon" />
          <h3>No matching songs found</h3>
          <p>No tracks in this playlist match "{filterText}".</p>
          <button
            type="button"
            className="playlist-clear-search-btn"
            onClick={() => setFilterText('')}
          >
            Clear Filter
          </button>
        </div>
      ) : (
        <div className="playlist-empty-box">
          {isLikedView ? (
            <>
              <Heart size={44} className="empty-icon" color="var(--accent-primary)" />
              <h3>Songs you like will appear here</h3>
              <p>Save songs you love by tapping the heart icon anywhere in the app.</p>
            </>
          ) : (
            <>
              <Sparkles size={44} className="empty-icon" color="var(--accent-primary)" />
              <h3>This playlist is waiting for tracks</h3>
              <p>Explore search or new releases and click <kbd>+</kbd> to add songs here!</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

