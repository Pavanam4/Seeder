import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  Plus,
  ListMusic,
  Disc3,
  Loader2,
  Maximize2,
  Sliders,
  PictureInPicture2,
} from 'lucide-react';
import type { MusicTrack, RepeatMode, YTPlayerStateName, AudioQuality } from '../types';
import { MusicQualityMenu, getQualityLabel } from './MusicQualityMenu';

interface BottomPlayerProps {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  playerState: YTPlayerStateName;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isLiked: boolean;
  showQueue: boolean;
  quality: AudioQuality;
  onQualityChange: (quality: AudioQuality) => void;
  onOpenExpanded: () => void;
  onTogglePlay: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleLike: (track: MusicTrack) => void;
  onOpenAddToPlaylist: (track: MusicTrack) => void;
  onToggleQueue: () => void;
}

export const BottomPlayer: React.FC<BottomPlayerProps> = ({
  currentTrack,
  isPlaying,
  playerState,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  isLiked,
  showQueue,
  quality,
  onQualityChange,
  onOpenExpanded,
  onTogglePlay,
  onPrevTrack,
  onNextTrack,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onToggleLike,
  onOpenAddToPlaylist,
  onToggleQueue,
}) => {
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Close quality menu if playback queue is opened to prevent overlapping
  useEffect(() => {
    if (showQueue) {
      setShowQualityMenu(false);
    }
  }, [showQueue]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onSeek(val);
  };

  const effectiveDuration = duration > 0 ? duration : currentTrack?.durationSeconds || 100;
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;
  const qualityLabel = getQualityLabel(quality);

  return (
    <footer className="pro-bottom-player" aria-label="Playback Controls">
      {/* Left Column: Track Info (Click to Expand Video & Audio Theater) */}
      <div className="bottom-player-left">
        {currentTrack ? (
          <div
            className="now-playing-meta-box is-expandable"
            onClick={onOpenExpanded}
            title="Click track to open video & music theater view"
          >
            <div className="now-playing-thumb-wrap">
              <img
                src={currentTrack.thumbnailUrl}
                alt={currentTrack.title}
                className="now-playing-thumb-img"
              />
              <div className="thumb-expand-hover-overlay" title="Open Theater View">
                <Maximize2 size={16} color="#ffffff" />
              </div>
              {isPlaying && playerState === 'PLAYING' && (
                <div className="audio-live-bars-overlay" title="Playing">
                  <span className="live-bar bar-1" />
                  <span className="live-bar bar-2" />
                  <span className="live-bar bar-3" />
                </div>
              )}
            </div>

            <div className="now-playing-titles">
              <span className="now-playing-song" title={currentTrack.title}>
                {currentTrack.title}
              </span>
              <span className="now-playing-artist" title={currentTrack.artist}>
                {currentTrack.artist}
                {currentTrack.album ? ` • ${currentTrack.album}` : ''}
              </span>
            </div>

            <div className="now-playing-actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={`player-heart-btn ${isLiked ? 'is-liked' : ''}`}
                onClick={() => onToggleLike(currentTrack)}
                title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs (L)'}
              >
                <Heart size={18} fill={isLiked ? 'var(--accent-primary)' : 'none'} />
              </button>

              <button
                type="button"
                className="player-add-btn"
                onClick={() => onOpenAddToPlaylist(currentTrack)}
                title="Add to Playlist"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Mobile-only action buttons (device, like checkmark, play/pause) matching Spotify spec */}
            <div className="mobile-mini-player-actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="mobile-mini-btn mobile-mini-device-btn"
                onClick={onOpenExpanded}
                title="Connect to a device / Theater Mode"
                aria-label="Connect to a device"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="6" width="13" height="12" rx="2" />
                  <rect x="17" y="9" width="5" height="9" rx="1" />
                  <path d="M7 18v2" />
                  <path d="M11 18v2" />
                </svg>
              </button>

              <button
                type="button"
                className={`mobile-mini-btn mobile-mini-like-btn ${isLiked ? 'is-liked' : ''}`}
                onClick={() => onToggleLike(currentTrack)}
                title={isLiked ? 'Saved to Your Library' : 'Save to Your Library'}
                aria-label="Save to Your Library"
              >
                {isLiked ? (
                  <div className="spotify-green-check-badge">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#000000"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ) : (
                  <Heart size={20} color="#b3b3b3" />
                )}
              </button>

              <button
                type="button"
                className="mobile-mini-btn mobile-mini-play-btn"
                onClick={onTogglePlay}
                title={isPlaying ? 'Pause' : 'Play'}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {playerState === 'BUFFERING' ? (
                  <Loader2 size={22} className="spin-animate" color="#ffffff" />
                ) : isPlaying ? (
                  <Pause size={24} fill="#ffffff" color="#ffffff" />
                ) : (
                  <Play size={24} fill="#ffffff" color="#ffffff" style={{ marginLeft: 2 }} />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="player-idle-placeholder">
            <Disc3 size={24} className="idle-disc-icon" />
            <div className="idle-text-wrap">
              <span className="idle-title">Select a track to play</span>
              <span className="idle-sub">Music from your catalog or library</span>
            </div>
          </div>
        )}
      </div>

      {/* Center Column: Transport Controls & Scrubber */}
      <div className="bottom-player-center">
        <div className="transport-row">
          <button
            type="button"
            className={`transport-control-btn ${isShuffle ? 'is-active-dot' : ''}`}
            onClick={onToggleShuffle}
            title={isShuffle ? 'Disable Shuffle' : 'Enable Shuffle'}
          >
            <Shuffle size={16} />
          </button>

          <button
            type="button"
            className="transport-control-btn"
            onClick={onPrevTrack}
            disabled={!currentTrack}
            title="Previous (Ctrl + Left)"
          >
            <SkipBack size={18} />
          </button>

          <button
            type="button"
            className="transport-hero-play-btn"
            onClick={onTogglePlay}
            disabled={!currentTrack}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {playerState === 'BUFFERING' ? (
              <Loader2 size={18} className="spin-animate" color="#120e0a" />
            ) : isPlaying ? (
              <Pause size={18} fill="#120e0a" color="#120e0a" />
            ) : (
              <Play size={18} fill="#120e0a" color="#120e0a" style={{ marginLeft: 2 }} />
            )}
          </button>

          <button
            type="button"
            className="transport-control-btn"
            onClick={onNextTrack}
            disabled={!currentTrack}
            title="Next (Ctrl + Right)"
          >
            <SkipForward size={18} />
          </button>

          <button
            type="button"
            className={`transport-control-btn ${repeatMode !== 'off' ? 'is-active-dot' : ''}`}
            onClick={onCycleRepeat}
            title={`Repeat: ${repeatMode === 'off' ? 'Off' : repeatMode === 'all' ? 'All Songs' : 'Current Song'}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={16} />}
            {repeatMode !== 'off' && <span className="transport-active-indicator" />}
          </button>
        </div>

        {/* Timeline Scrubber */}
        <div className="scrubber-bar-row">
          <span className="scrubber-time-label current">{formatTime(currentTime)}</span>
          <div className="scrubber-track-wrap">
            <input
              type="range"
              className="pro-scrubber-slider"
              min={0}
              max={effectiveDuration}
              step={0.5}
              value={currentTime}
              onChange={handleSliderChange}
              disabled={!currentTrack}
              style={{
                background: `linear-gradient(to right, var(--accent-primary) ${progressPercent}%, rgba(255,255,255,0.18) ${progressPercent}%)`,
              }}
              aria-label="Audio scrubber"
            />
          </div>
          <span className="scrubber-time-label total">{formatTime(effectiveDuration)}</span>
        </div>
      </div>

      {/* Right Column: Quality Switcher, Expand Button, Queue, YouTube Link, and Volume */}
      <div className="bottom-player-right">
        {/* Music Quality Switcher (Image 4 Design) */}
        <div className="bottom-quality-selector-wrap">
          <button
            type="button"
            className={`bottom-quality-pill-trigger ${showQualityMenu ? 'is-open' : ''}`}
            onClick={() => {
              if (!showQualityMenu && showQueue) {
                onToggleQueue();
              }
              setShowQualityMenu(!showQualityMenu);
            }}
            title="Music Quality Settings"
            aria-expanded={showQualityMenu}
            aria-haspopup="true"
          >
            <Sliders size={13} className="quality-pill-icon" />
            <span className="quality-pill-label">{qualityLabel}</span>
          </button>

          <MusicQualityMenu
            isOpen={showQualityMenu}
            onClose={() => setShowQualityMenu(false)}
            quality={quality}
            onQualityChange={onQualityChange}
            position="top"
          />
        </div>

        {/* Mini Pop-out Player Button */}
        {currentTrack && (
          <button
            type="button"
            className="pro-aux-btn pip-player-trigger"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('seeder-toggle-mini-player'));
            }}
            title="Mini Player Pop-out (Pops automatically when minimized)"
            aria-label="Mini Player Pop-out"
          >
            <PictureInPicture2 size={16} />
          </button>
        )}

        {/* Expand Video & Audio Theater View Button */}
        {currentTrack && (
          <button
            type="button"
            className="pro-aux-btn theater-expand-trigger"
            onClick={onOpenExpanded}
            title="Expand to Full Video & Audio Mode"
            aria-label="Expand to full video and audio mode"
          >
            <Maximize2 size={16} />
          </button>
        )}

        {/* Playback Queue Button */}
        <button
          type="button"
          className={`pro-aux-btn ${showQueue ? 'is-aux-active' : ''}`}
          onClick={() => {
            if (!showQueue) {
              setShowQualityMenu(false);
            }
            onToggleQueue();
          }}
          title={showQueue ? 'Close queue' : 'Open queue'}
        >
          <ListMusic size={18} />
        </button>

        {/* Volume Slider */}
        <div className="volume-slider-group">
          <button
            type="button"
            className="volume-mute-toggle"
            onClick={onToggleMute}
            title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX size={18} />
            ) : volume < 50 ? (
              <Volume1 size={18} />
            ) : (
              <Volume2 size={18} />
            )}
          </button>

          <input
            type="range"
            className="pro-volume-slider"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseInt(e.target.value, 10))}
            style={{
              background: `linear-gradient(to right, var(--accent-primary) ${isMuted ? 0 : volume}%, rgba(255,255,255,0.2) ${isMuted ? 0 : volume}%)`,
            }}
            aria-label="Volume slider"
          />
        </div>
      </div>

      {/* Mobile-only bottom progress line matching user screenshot */}
      <div className="mobile-mini-progress-bar">
        <div
          className="mobile-mini-progress-fill"
          style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
        />
      </div>
    </footer>
  );
};
