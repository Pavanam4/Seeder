import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  X,
  Check,
  Plus,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import type { MusicTrack } from '../types';

interface MiniPlayerPopupProps {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLiked?: boolean;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSeek: (seconds: number) => void;
  onToggleMute: () => void;
  onToggleLike?: (track: MusicTrack) => void;
  onOpenApp?: () => void;
  onOpenExpanded?: () => void;
  autoPopOnMinimize?: boolean;
}

const FALLBACK_POPUP_ART =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23121212'/%3E%3Ccircle cx='50' cy='50' r='32' fill='%23222222'/%3E%3Cpath d='M44 34v32l22-16z' fill='%231ed760'/%3E%3C/svg%3E";

export const MiniPlayerPopup: React.FC<MiniPlayerPopupProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isLiked = false,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSeek,
  onToggleMute,
  onToggleLike,
  onOpenApp,
  onOpenExpanded,
  autoPopOnMinimize = true,
}) => {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [showInAppPopup, setShowInAppPopup] = useState(false);
  const pipWindowRef = useRef<Window | null>(null);
  const isOpeningRef = useRef(false);

  // Position for in-app draggable popup
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Keep ref synced
  useEffect(() => {
    pipWindowRef.current = pipWindow;
  }, [pipWindow]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const effectiveDuration = duration > 0 ? duration : currentTrack?.durationSeconds || 180;
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  // Request Document Picture-in-Picture window if supported, otherwise open in-app popup
  const openMiniPlayer = useCallback(async () => {
    if (!('documentPictureInPicture' in window)) {
      setShowInAppPopup(true);
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
        width: 270,
        height: 315,
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
          background: #000000;
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
          background: #000000;
          padding: 10px 12px;
        }
        .pip-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
          color: #a7a7a7;
          font-size: 0.76rem;
          font-weight: 600;
        }
        .pip-art-wrap {
          width: 100%;
          height: 155px;
          border-radius: 8px;
          overflow: hidden;
          background: #111111;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7);
        }
        .pip-art-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .pip-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
          gap: 8px;
        }
        .pip-titles {
          flex: 1;
          min-width: 0;
        }
        .pip-title {
          font-size: 1.02rem;
          font-weight: 800;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pip-artist {
          font-size: 0.78rem;
          color: #a7a7a7;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }
        .pip-check-badge {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #1ed760;
          color: #05240c;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .pip-progress-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
        }
        .pip-time {
          font-size: 0.7rem;
          color: #a7a7a7;
          min-width: 26px;
        }
        .pip-progress-track {
          flex: 1;
          height: 3px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 2px;
          cursor: pointer;
          position: relative;
        }
        .pip-progress-fill {
          height: 100%;
          background: #1ed760;
          border-radius: 2px;
        }
        .pip-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 8px;
        }
        .pip-ctrl-btn {
          background: transparent;
          border: none;
          color: #b3b3b3;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pip-ctrl-btn:hover {
          color: #ffffff;
        }
        .pip-play-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #ffffff;
          color: #05240c;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `;
      win.document.head.appendChild(styleEl);

      win.document.title = `${currentTrack?.title || 'Now Playing'} • Seeder`;

      win.addEventListener('pagehide', () => {
        setPipWindow(null);
        pipWindowRef.current = null;
      });

      setPipWindow(win);
      setShowInAppPopup(false);
    } catch (err) {
      console.warn('Could not open Document PiP window, falling back to in-app popup:', err);
      setShowInAppPopup(true);
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

  // Expose toggle globally for the player bar PiP button
  useEffect(() => {
    const handleToggleEvent = () => {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        closeMiniPlayer();
        return;
      }
      setShowInAppPopup((prev) => !prev);
    };
    window.addEventListener('seeder-toggle-mini-player', handleToggleEvent);
    return () => {
      window.removeEventListener('seeder-toggle-mini-player', handleToggleEvent);
    };
  }, [closeMiniPlayer]);

  // Keep media playback active when tab is minimized or switched
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isPlaying && 'mediaSession' in navigator) {
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

  // mediaSession is managed centrally by PlayerTestPanel for background audio resiliency

  // Draggable logic for in-app popup
  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPosition({
        x: dragStartRef.current.startX + dx,
        y: dragStartRef.current.startY + dy,
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <>
      {/* Native Picture-in-Picture Window Portal (When OS PiP is active) */}
      {pipWindow &&
        !pipWindow.closed &&
        currentTrack &&
        createPortal(
          <div className="pip-mini-root" role="dialog" aria-label="Mini Music Player">
            <div className="pip-header">
              <span>Now Playing</span>
            </div>

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

            <div className="pip-meta-row">
              <div className="pip-titles">
                <div className="pip-title" title={currentTrack.title}>
                  {currentTrack.title}
                </div>
                <div className="pip-artist" title={currentTrack.artist}>
                  {currentTrack.artist}
                </div>
              </div>

              <button
                type="button"
                className="pip-check-badge"
                onClick={() => onToggleLike?.(currentTrack)}
                title={isLiked ? 'Saved' : 'Save'}
              >
                {isLiked ? (
                  <Check size={16} strokeWidth={3} color="#05240c" />
                ) : (
                  <Plus size={16} strokeWidth={2.5} color="#05240c" />
                )}
              </button>
            </div>

            <div className="pip-progress-row">
              <span className="pip-time">{formatTime(currentTime)}</span>
              <div
                className="pip-progress-track"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  onSeek(clickPos * effectiveDuration);
                }}
              >
                <div className="pip-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="pip-time">{formatTime(effectiveDuration)}</span>
            </div>

            <div className="pip-controls">
              <button
                type="button"
                className="pip-ctrl-btn"
                onClick={onPrevTrack}
                title="Previous track"
              >
                <SkipBack size={16} />
              </button>
              <button
                type="button"
                className="pip-play-btn"
                onClick={onTogglePlay}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={18} fill="#05240c" color="#05240c" />
                ) : (
                  <Play size={18} fill="#05240c" color="#05240c" style={{ marginLeft: 2 }} />
                )}
              </button>
              <button
                type="button"
                className="pip-ctrl-btn"
                onClick={onNextTrack}
                title="Next track"
              >
                <SkipForward size={16} />
              </button>
            </div>
          </div>,
          pipWindow.document.body
        )}

      {/* Floating In-App Mini Pop-up Window (Matching Image 3 specification) */}
      {showInAppPopup && (!pipWindow || pipWindow.closed) && currentTrack && (
        <div
          className="spotify-pip-modal-card"
          role="dialog"
          aria-label="Mini Music Player"
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
          }}
        >
          {/* Top Header Bar matching Image 3 */}
          <div className="spotify-pip-header-bar" onMouseDown={handleDragStart}>
            <div className="spotify-pip-header-left">
              <span className="spotify-pip-header-domain">Now Playing</span>
            </div>

            <div className="spotify-pip-header-actions">
              {/* Optional: pop out to native OS window if supported */}
              {'documentPictureInPicture' in window && (
                <button
                  type="button"
                  className="spotify-pip-header-btn"
                  onClick={openMiniPlayer}
                  title="Detach into floating OS window"
                  aria-label="Detach window"
                >
                  <ExternalLink size={13} />
                </button>
              )}

              {onOpenExpanded && (
                <button
                  type="button"
                  className="spotify-pip-header-btn"
                  onClick={() => {
                    setShowInAppPopup(false);
                    onOpenExpanded();
                  }}
                  title="Expand to Full Player"
                  aria-label="Expand player"
                >
                  <Maximize2 size={13} />
                </button>
              )}

              <button
                type="button"
                className="spotify-pip-header-btn close"
                onClick={() => setShowInAppPopup(false)}
                title="Close mini player"
                aria-label="Close mini player"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Main Card Content */}
          <div className="spotify-pip-card-body">
            {/* Large Album Artwork matching Image 3 */}
            <div className="spotify-pip-art-wrap">
              <img
                src={currentTrack.thumbnailUrl || FALLBACK_POPUP_ART}
                alt={currentTrack.title}
                className="spotify-pip-art-img"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_POPUP_ART;
                }}
              />
            </div>

            {/* Track Info & Spotify-Style Green Checkmark Badge matching Image 3 */}
            <div className="spotify-pip-meta-row">
              <div className="spotify-pip-titles">
                <h3 className="spotify-pip-title" title={currentTrack.title}>
                  {currentTrack.title}
                </h3>
                <p className="spotify-pip-artist" title={currentTrack.artist}>
                  {currentTrack.artist}
                </p>
              </div>

              {/* Green round checkmark button matching Image 3 */}
              <button
                type="button"
                className={`spotify-pip-check-badge ${isLiked ? 'is-liked' : ''}`}
                onClick={() => onToggleLike?.(currentTrack)}
                title={isLiked ? 'Saved to Your Library' : 'Save to Your Library'}
                aria-label={isLiked ? 'Saved to Your Library' : 'Save to Your Library'}
              >
                {isLiked ? (
                  <Check size={16} strokeWidth={3} color="#05240c" />
                ) : (
                  <Plus size={16} strokeWidth={2.5} color="#ffffff" />
                )}
              </button>
            </div>

            {/* Mini Progress Scrubber */}
            <div className="spotify-pip-progress-row">
              <span className="spotify-pip-time">{formatTime(currentTime)}</span>
              <div
                className="spotify-pip-progress-track"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  onSeek(clickPos * effectiveDuration);
                }}
                title="Seek"
              >
                <div
                  className="spotify-pip-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="spotify-pip-time">{formatTime(effectiveDuration)}</span>
            </div>

            {/* Playback Controls */}
            <div className="spotify-pip-controls-row">
              <button
                type="button"
                className="spotify-pip-ctrl-btn"
                onClick={onPrevTrack}
                title="Previous track"
              >
                <SkipBack size={17} />
              </button>

              <button
                type="button"
                className="spotify-pip-play-btn"
                onClick={onTogglePlay}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={19} fill="#05240c" color="#05240c" />
                ) : (
                  <Play size={19} fill="#05240c" color="#05240c" style={{ marginLeft: 2 }} />
                )}
              </button>

              <button
                type="button"
                className="spotify-pip-ctrl-btn"
                onClick={onNextTrack}
                title="Next track"
              >
                <SkipForward size={17} />
              </button>
            </div>

            {/* Resize Grip Handle matching Image 3 bottom right */}
            <div className="spotify-pip-resize-grip" title="Resize handle">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <line
                  x1="9"
                  y1="1"
                  x2="1"
                  y2="9"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="9"
                  y1="5"
                  x2="5"
                  y2="9"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
