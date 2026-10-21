import React, { useEffect } from 'react';
import { X, MinusCircle, ListMusic, Trash2 } from 'lucide-react';
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

const FALLBACK_ARTWORK =
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  currentTrack,
  queue,
  onPlayTrack,
  onClearQueue,
  onRemoveFromQueue,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalTracks = queue.length + (currentTrack ? 1 : 0);

  return (
    <>
      {/* Blurred Dim Backdrop Overlay */}
      <div
        className="queue-sheet-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom to Middle Queue Sheet */}
      <aside
        className="queue-bottom-sheet"
        role="dialog"
        aria-label="Upcoming Queue"
        aria-modal="true"
      >
        {/* Top Centered Drag Handle with sleek floating quick actions */}
        <div className="queue-sheet-top-rail">
          <div className="queue-sheet-drag-handle" onClick={onClose} title="Click to close queue" />
          
          <div className="queue-sheet-top-floating-actions">
            {queue.length > 0 && (
              <button
                type="button"
                className="queue-sheet-quick-clear"
                onClick={onClearQueue}
                title="Clear all tracks in queue"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              className="queue-sheet-quick-close"
              onClick={onClose}
              title="Close queue"
              aria-label="Close queue"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sheet Scrollable Track List */}
        <div className="queue-sheet-scroll-body">
          {/* Currently Streaming Track (if any) */}
          {currentTrack && (
            <div
              className="queue-bottom-track-row is-now-playing"
              onClick={() => onPlayTrack(currentTrack)}
              role="button"
              tabIndex={0}
            >
              <img
                src={currentTrack.thumbnailUrl || FALLBACK_ARTWORK}
                alt={currentTrack.title}
                className="queue-bottom-track-thumb"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_ARTWORK;
                }}
              />
              <div className="queue-bottom-track-meta">
                <span className="queue-bottom-artist-name" title={currentTrack.artist}>
                  {currentTrack.artist || 'UNKNOWN ARTIST'}
                </span>
                <span className="queue-bottom-song-name" title={currentTrack.title}>
                  {currentTrack.title}
                </span>
              </div>
              <div className="queue-now-playing-bars" title="Now playing">
                <span className="q-bar q-1" />
                <span className="q-bar q-2" />
                <span className="q-bar q-3" />
              </div>
            </div>
          )}

          {/* Upcoming Queued Tracks (matching user reference image) */}
          {queue.length > 0 ? (
            queue.map((track, idx) => (
              <div
                key={`${track.id}-${idx}`}
                className="queue-bottom-track-row"
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
                {/* Square Album Cover */}
                <img
                  src={track.thumbnailUrl || FALLBACK_ARTWORK}
                  alt={track.title}
                  className="queue-bottom-track-thumb"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_ARTWORK;
                  }}
                />

                {/* Track Details: ARTIST above (uppercase, muted), TITLE below (bold white) */}
                <div className="queue-bottom-track-meta">
                  <span className="queue-bottom-artist-name" title={track.artist}>
                    {track.artist || 'UNKNOWN ARTIST'}
                  </span>
                  <span className="queue-bottom-song-name" title={track.title}>
                    {track.title}
                  </span>
                </div>

                {/* Circle Minus Action on Far Right */}
                {onRemoveFromQueue && (
                  <button
                    type="button"
                    className="queue-bottom-remove-circle-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromQueue(idx);
                    }}
                    title="Remove from queue"
                    aria-label={`Remove ${track.title} from queue`}
                  >
                    <MinusCircle size={22} strokeWidth={1.6} />
                  </button>
                )}
              </div>
            ))
          ) : !currentTrack ? (
            <div className="queue-sheet-empty-state">
              <ListMusic size={34} />
              <p className="empty-title">Queue is empty</p>
              <p className="empty-subtitle">Play any song or playlist to start your stream</p>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
};
