import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import type { MusicTrack } from '../types';

interface MiniPlayerPopupProps {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSeek: (seconds: number) => void;
  onToggleMute: () => void;
  onOpenApp?: () => void;
  autoPopOnMinimize?: boolean;
}

const FALLBACK_POPUP_ART =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231f1d1a'/%3E%3Ccircle cx='50' cy='50' r='32' fill='%232a2622'/%3E%3Cpath d='M44 34v32l22-16z' fill='%23f59e0b'/%3E%3C/svg%3E";

export const MiniPlayerPopup: React.FC<MiniPlayerPopupProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSeek,
  onToggleMute,
  onOpenApp,
  autoPopOnMinimize = true,
}) => {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [showInAppPopup, setShowInAppPopup] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);
  const isOpeningRef = useRef(false);

  // Keep ref synced
  useEffect(() => {
    pipWindowRef.current = pipWindow;
  }, [pipWindow]);

  // Request Document Picture-in-Picture window
  const openMiniPlayer = useCallback(async () => {
    if (!('documentPictureInPicture' in window)) {
      console.info('Document Picture-in-Picture API is not supported in this browser.');
      return;
    }

    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.focus();
      return;
    }

    if (isOpeningRef.current) return;
    isOpeningRef.current = true;

    try {
      const win = await (window as any).documentPictureInPicture.requestWindow({
        width: 360,
        height: 130,
      });

      // Inject styling into PiP window
      const styleEl = win.document.createElement('style');
      styleEl.textContent = `
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          background: #12100e;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          overflow: hidden;
          user-select: none;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .pip-mini-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: linear-gradient(135deg, #181512 0%, #0e0d0b 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .pip-main-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          flex: 1;
          min-width: 0;
        }
        .pip-art-wrap {
          width: 52px;
          height: 52px;
          min-width: 52px;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
          background: #24201c;
        }
        .pip-art-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pip-track-meta {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .pip-track-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pip-track-artist {
          font-size: 0.74rem;
          color: #a1a1aa;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pip-controls {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .pip-ctrl-btn {
          background: transparent;
          border: none;
          color: #d4d4d8;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pip-ctrl-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.12);
        }
        .pip-play-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #f59e0b;
          color: #120e0a;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(245, 158, 11, 0.45);
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .pip-play-btn:hover {
          transform: scale(1.08);
          background: #fbbf24;
        }
        .pip-progress-row {
          height: 4px;
          background: rgba(255, 255, 255, 0.08);
          width: 100%;
          position: relative;
          cursor: pointer;
        }
        .pip-progress-bar {
          height: 100%;
          background: #f59e0b;
          transition: width 0.2s linear;
        }
        .pip-badge {
          position: absolute;
          top: 6px;
          right: 8px;
          font-size: 0.62rem;
          font-weight: 700;
          color: #f59e0b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          opacity: 0.8;
        }
      `;
      win.document.head.appendChild(styleEl);

      win.document.title = `Seeder Play • ${currentTrack?.title || 'Now Playing'}`;

      win.addEventListener('pagehide', () => {
        setPipWindow(null);
        pipWindowRef.current = null;
      });

      setPipWindow(win);
    } catch (err) {
      console.warn('Could not open Document PiP window:', err);
    } finally {
      isOpeningRef.current = false;
    }
  }, [currentTrack]);

  // Close PiP window
  const closeMiniPlayer = useCallback(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      try {
        pipWindowRef.current.close();
      } catch (e) {
        // Ignored
      }
      setPipWindow(null);
      pipWindowRef.current = null;
    }
  }, []);

  // Expose toggle globally or via custom event
  useEffect(() => {
    const handleToggleEvent = () => {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        closeMiniPlayer();
      } else {
        openMiniPlayer();
      }
    };
    window.addEventListener('seeder-toggle-mini-player', handleToggleEvent);
    return () => {
      window.removeEventListener('seeder-toggle-mini-player', handleToggleEvent);
    };
  }, [openMiniPlayer, closeMiniPlayer]);

  // Keep media playback active when tab is minimized or switched
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App is minimized or switched to another tab
        if (isPlaying && ('mediaSession' in navigator)) {
          try {
            navigator.mediaSession.playbackState = 'playing';
          } catch (e) {}
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying]);

  // Sync navigator.mediaSession for native OS media popover
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Seeder Play',
        artwork: currentTrack.thumbnailUrl
          ? [
              { src: currentTrack.thumbnailUrl, sizes: '96x96', type: 'image/jpeg' },
              { src: currentTrack.thumbnailUrl, sizes: '128x128', type: 'image/jpeg' },
              { src: currentTrack.thumbnailUrl, sizes: '256x256', type: 'image/jpeg' },
              { src: currentTrack.thumbnailUrl, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [],
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', onTogglePlay);
      navigator.mediaSession.setActionHandler('pause', onTogglePlay);
      navigator.mediaSession.setActionHandler('previoustrack', onPrevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', onNextTrack);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          onSeek(details.seekTime);
        }
      });
    } catch (err) {
      console.warn('MediaSession registration error:', err);
    }
  }, [currentTrack, isPlaying, onTogglePlay, onPrevTrack, onNextTrack, onSeek]);

  const effectiveDuration = duration > 0 ? duration : currentTrack?.durationSeconds || 180;
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  return (
    <>
      {/* Native Picture-in-Picture Window Portal */}
      {pipWindow && !pipWindow.closed && currentTrack &&
        createPortal(
          <div className="pip-mini-root" role="dialog" aria-label="Mini Music Player">
            <div className="pip-main-row">
              {/* Artwork */}
              <div className="pip-art-wrap">
                <img
                  src={currentTrack.thumbnailUrl || FALLBACK_POPUP_ART}
                  alt={currentTrack.title}
                  className="pip-art-img"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_POPUP_ART;
                  }}
                />
              </div>

              {/* Metadata */}
              <div className="pip-track-meta">
                <div className="pip-track-title" title={currentTrack.title}>
                  {currentTrack.title}
                </div>
                <div className="pip-track-artist" title={currentTrack.artist}>
                  {currentTrack.artist}
                </div>
              </div>

              {/* Playback Controls */}
              <div className="pip-controls">
                <button
                  type="button"
                  className="pip-ctrl-btn"
                  onClick={onPrevTrack}
                  title="Previous"
                  aria-label="Previous track"
                >
                  <SkipBack size={15} />
                </button>

                <button
                  type="button"
                  className="pip-play-btn"
                  onClick={onTogglePlay}
                  title={isPlaying ? 'Pause' : 'Play'}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={17} fill="#120e0a" color="#120e0a" />
                  ) : (
                    <Play size={17} fill="#120e0a" color="#120e0a" style={{ marginLeft: 2 }} />
                  )}
                </button>

                <button
                  type="button"
                  className="pip-ctrl-btn"
                  onClick={onNextTrack}
                  title="Next"
                  aria-label="Next track"
                >
                  <SkipForward size={15} />
                </button>
              </div>
            </div>

            {/* Progress Bar Line */}
            <div
              className="pip-progress-row"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickPos = (e.clientX - rect.left) / rect.width;
                const targetTime = clickPos * effectiveDuration;
                onSeek(targetTime);
              }}
              title="Seek"
            >
              <div className="pip-progress-bar" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>,
          pipWindow.document.body
        )}

      {/* Floating In-App Mini Pop-up (Visible when floating is enabled) */}
      {showInAppPopup && (!pipWindow || pipWindow.closed) && currentTrack && (
        <div className="floating-mini-player-toast" role="dialog" aria-label="Mini Music Player">
          <div className="floating-pip-header">
            <span className="floating-pip-badge">Now Playing</span>
            <button
              type="button"
              className="floating-pip-close-btn"
              onClick={() => setShowInAppPopup(false)}
              aria-label="Close popup"
            >
              ✕
            </button>
          </div>
          <div className="pip-main-row">
            <div className="pip-art-wrap">
              <img
                src={currentTrack.thumbnailUrl || FALLBACK_POPUP_ART}
                alt={currentTrack.title}
                className="pip-art-img"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_POPUP_ART;
                }}
              />
            </div>
            <div className="pip-track-meta">
              <div className="pip-track-title" title={currentTrack.title}>
                {currentTrack.title}
              </div>
              <div className="pip-track-artist" title={currentTrack.artist}>
                {currentTrack.artist}
              </div>
            </div>
            <div className="pip-controls">
              <button
                type="button"
                className="pip-ctrl-btn"
                onClick={onPrevTrack}
                title="Previous track"
              >
                <SkipBack size={15} />
              </button>
              <button
                type="button"
                className="pip-play-btn"
                onClick={onTogglePlay}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={17} fill="#120e0a" color="#120e0a" />
                ) : (
                  <Play size={17} fill="#120e0a" color="#120e0a" style={{ marginLeft: 2 }} />
                )}
              </button>
              <button
                type="button"
                className="pip-ctrl-btn"
                onClick={onNextTrack}
                title="Next track"
              >
                <SkipForward size={15} />
              </button>
            </div>
          </div>
          <div
            className="pip-progress-row"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickPos = (e.clientX - rect.left) / rect.width;
              onSeek(clickPos * effectiveDuration);
            }}
          >
            <div className="pip-progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}
    </>
  );
};
