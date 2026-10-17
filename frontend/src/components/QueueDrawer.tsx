import React from 'react';
import { X, ListMusic, Trash2, Play, Music } from 'lucide-react';
import type { MusicTrack } from '../types';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: MusicTrack | null;
  queue: MusicTrack[];
  onPlayTrack: (track: MusicTrack) => void;
  onClearQueue: () => void;
  onRemoveFromQueue?: (index: number) => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  currentTrack,
  queue,
  onPlayTrack,
  onClearQueue,
  onRemoveFromQueue,
}) => {
  if (!isOpen) return null;

  const totalTracks = queue.length + (currentTrack ? 1 : 0);

  return (
    <aside className="pro-queue-drawer-panel" aria-label="Playback Queue">
      {/* Drawer Header */}
      <div className="queue-panel-header">
        <div className="queue-header-left">
          <div className="queue-header-icon-box">
            <ListMusic size={18} className="queue-header-glyph" />
          </div>
          <div className="queue-header-titles">
            <h2 className="queue-main-title">Playback Queue</h2>
            <span className="queue-count-badge">
              {totalTracks} {totalTracks === 1 ? 'track' : 'tracks'}
            </span>
          </div>
        </div>

        <div className="queue-header-actions">
          <button
            type="button"
            className="queue-close-action-btn"
            onClick={onClose}
            title="Close queue"
            aria-label="Close playback queue"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Drawer Content */}
      <div className="queue-panel-body">
        {/* NOW PLAYING CARD */}
        {currentTrack && (
          <div className="queue-category-group">
            <div className="queue-category-header">
              <span className="category-label-accent">NOW PLAYING</span>
              <span className="category-live-status">Streaming</span>
            </div>

            <div className="queue-now-playing-card">
              <div className="now-playing-thumb-container">
                <img
                  src={currentTrack.thumbnailUrl}
                  alt={currentTrack.title}
                  className="now-playing-cover-img"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%231e1c18'/%3E%3Cpath d='M20 14v12m0-6a3 3 0 1 1-3-3 3 3 0 0 1 3 3zm0 0v-3l6-2v5' fill='none' stroke='%23f59e0b' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E";
                  }}
                />
                <div className="queue-live-eq-overlay" aria-hidden="true">
                  <span className="q-bar q-1" />
                  <span className="q-bar q-2" />
                  <span className="q-bar q-3" />
                </div>
              </div>

              <div className="now-playing-meta-col">
                <span className="now-playing-song-name" title={currentTrack.title}>
                  {currentTrack.title}
                </span>
                <span className="now-playing-artist-name" title={currentTrack.artist}>
                  {currentTrack.artist}
                </span>
                {currentTrack.album && (
                  <span className="now-playing-album-name" title={currentTrack.album}>
                    {currentTrack.album}
                  </span>
                )}
              </div>

              {currentTrack.duration && (
                <span className="now-playing-duration-chip">{currentTrack.duration}</span>
              )}
            </div>
          </div>
        )}

        {/* NEXT IN QUEUE */}
        <div className="queue-category-group">
          <div className="queue-category-header">
            <span className="category-label">NEXT UP</span>
            <span className="category-sub-count">{queue.length} upcoming</span>
          </div>

          {queue.length > 0 ? (
            <div className="queue-list-scroll-area">
              {queue.map((track, idx) => (
                <div
                  key={`${track.id}-${idx}`}
                  className="queue-item-row"
                  onClick={() => onPlayTrack(track)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPlayTrack(track);
                    }
                  }}
                >
                  {/* Index Number / Play Icon on Hover */}
                  <div className="queue-index-cell">
                    <span className="index-digit">{idx + 1}</span>
                    <Play size={13} className="index-hover-play" fill="currentColor" />
                  </div>

                  {/* Artwork */}
                  <img
                    src={track.thumbnailUrl}
                    alt={track.title}
                    className="queue-item-artwork"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%231e1c18'/%3E%3Cpath d='M20 14v12m0-6a3 3 0 1 1-3-3 3 3 0 0 1 3 3zm0 0v-3l6-2v5' fill='none' stroke='%23f59e0b' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E";
                    }}
                  />

                  {/* Track Titles */}
                  <div className="queue-item-meta">
                    <span className="queue-item-title" title={track.title}>
                      {track.title}
                    </span>
                    <span className="queue-item-artist" title={track.artist}>
                      {track.artist}
                    </span>
                  </div>

                  {/* Right: Duration & Remove Item */}
                  <div className="queue-item-end">
                    {track.duration && (
                      <span className="queue-item-time">{track.duration}</span>
                    )}
                    {onRemoveFromQueue && (
                      <button
                        type="button"
                        className="queue-item-remove-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFromQueue(idx);
                        }}
                        title="Remove from queue"
                        aria-label={`Remove ${track.title} from queue`}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="queue-empty-placeholder">
              <div className="empty-glyph-disc">
                <Music size={24} />
              </div>
              <p className="empty-title">Queue is empty</p>
              <span className="empty-subtitle">
                Play any song, album, or playlist to build your upcoming track stream.
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
