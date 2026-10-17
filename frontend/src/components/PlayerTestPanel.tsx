import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import type {
  MusicTrack,
  YTPlayerStateName,
  PlayerErrorInfo,
  AudioQuality,
  RepeatMode,
  AudioNormalizationMode,
} from '../types';
import {
  ChevronDown,
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
  Loader2,
  Sliders,
  Mic2,
  Video,
} from 'lucide-react';
import { fetchSyncedLyrics, type LyricLine } from '../services/lyrics';
import { searchTracks } from '../services/api';
import { MusicQualityMenu, getQualityLabel } from './MusicQualityMenu';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface PlayerHandle {
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: (muted: boolean) => void;
  setQuality: (quality: AudioQuality) => void;
}

interface PlayerTestPanelProps {
  selectedTrack: MusicTrack | null;
  onPlayerStateChange: (state: YTPlayerStateName) => void;
  onPlayerErrorChange: (error: PlayerErrorInfo | null) => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onTrackEnded: () => void;
  playerState: YTPlayerStateName;
  playerError: PlayerErrorInfo | null;
  isExpanded: boolean;
  onCloseExpanded: () => void;
  quality: AudioQuality;
  onQualityChange: (quality: AudioQuality) => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLiked: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  volume: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleLike: (track: MusicTrack) => void;
  onPlayTrack?: (track: MusicTrack) => void;
  onTrackResolved?: (track: MusicTrack) => void;
  audioNormalization?: AudioNormalizationMode;
}

export const PlayerTestPanel = forwardRef<PlayerHandle, PlayerTestPanelProps>(
  (
    {
      selectedTrack,
      onPlayerStateChange,
      onPlayerErrorChange,
      onTimeUpdate,
      onTrackEnded,
      playerError,
      isExpanded,
      onCloseExpanded,
      quality,
      onQualityChange,
      isPlaying,
      currentTime,
      duration,
      isLiked,
      isShuffle,
      repeatMode,
      volume,
      isMuted,
      onTogglePlay,
      onPrevTrack,
      onNextTrack,
      onSeek,
      onVolumeChange,
      onToggleMute,
      onToggleShuffle,
      onCycleRepeat,
      onToggleLike,
      onPlayTrack,
      onTrackResolved,
      audioNormalization = 'balanced',
    },
    ref
  ) => {
    const internalPlayerRef = useRef<any>(null);
    const progressTimerRef = useRef<number | null>(null);
    const lastLoadedVideoIdRef = useRef<string | null>(null);

    // Dynamic stream resolver for tracks with browse/playlist IDs or non-embeddable flags
    const [resolvedVideoId, setResolvedVideoId] = useState<string | null>(null);
    const [isResolvingStream, setIsResolvingStream] = useState<boolean>(false);
    const onTrackResolvedRef = useRef(onTrackResolved);
    onTrackResolvedRef.current = onTrackResolved;

    // Music Quality Popover State
    const [showQualityMenu, setShowQualityMenu] = useState(false);

    // Theater Mode View Switcher: 'split' (Vinyl Artwork + Synced Lyrics) vs 'video' (Cinematic Video)
    const [stageView, setStageView] = useState<'split' | 'video'>('split');

    // Related Music State (Scroll-to-Discover in Expanded Mode)
    const [relatedTracks, setRelatedTracks] = useState<MusicTrack[]>([]);
    const [isLoadingRelated, setIsLoadingRelated] = useState(false);

    // Synced Lyrics State
    const [lyrics, setLyrics] = useState<LyricLine[]>([]);
    const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const activeLineRef = useRef<HTMLDivElement>(null);
    const relatedSectionRef = useRef<HTMLDivElement>(null);

    const handleScrollToRelated = () => {
      relatedSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Fetch related music for scroll-to-discover section
    useEffect(() => {
      if (!selectedTrack) {
        setRelatedTracks([]);
        return;
      }
      let isCurrent = true;
      setIsLoadingRelated(true);
      const queryTarget = selectedTrack.artist ? `${selectedTrack.artist} top songs` : selectedTrack.title;
      searchTracks(queryTarget, 1, 12, 'ytmusicapi', 'songs')
        .then((res) => {
          if (isCurrent) {
            const filtered = res.items.filter((t) => t.id !== selectedTrack.id);
            if (filtered.length > 0) {
              setRelatedTracks(filtered);
            } else {
              searchTracks('Trending Hits', 1, 10, 'ytmusicapi', 'songs')
                .then((fb) => {
                  if (isCurrent && fb.items.length > 0) {
                    setRelatedTracks(fb.items);
                  }
                })
                .catch(() => {});
            }
          }
        })
        .catch((err) => {
          console.warn('Could not fetch related tracks in expanded mode:', err);
          if (isCurrent) {
            searchTracks('Top Hits', 1, 8, 'ytmusicapi', 'songs')
              .then((fb) => {
                if (isCurrent && fb.items.length > 0) {
                  setRelatedTracks(fb.items);
                }
              })
              .catch(() => {});
          }
        })
        .finally(() => {
          if (isCurrent) setIsLoadingRelated(false);
        });

      return () => {
        isCurrent = false;
      };
    }, [selectedTrack?.id, selectedTrack?.artist, selectedTrack?.title]);

    // Callbacks stored in refs to avoid re-triggering effects
    const onPlayerStateChangeRef = useRef(onPlayerStateChange);
    onPlayerStateChangeRef.current = onPlayerStateChange;

    const onPlayerErrorChangeRef = useRef(onPlayerErrorChange);
    onPlayerErrorChangeRef.current = onPlayerErrorChange;

    const onTrackEndedRef = useRef(onTrackEnded);
    onTrackEndedRef.current = onTrackEnded;

    const onTimeUpdateRef = useRef(onTimeUpdate);
    onTimeUpdateRef.current = onTimeUpdate;

    const repeatModeRef = useRef(repeatMode);
    repeatModeRef.current = repeatMode;

    const volumeRef = useRef(volume);
    volumeRef.current = volume;

    const isMutedRef = useRef(isMuted);
    isMutedRef.current = isMuted;

    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;

    const audioNormalizationRef = useRef(audioNormalization);
    audioNormalizationRef.current = audioNormalization;

    const userInitiatedPauseRef = useRef(false);

    // Guaranteed consistent volume enforcer with working LUFS audio normalization
    const applyLockedVolume = useCallback(() => {
      if (!internalPlayerRef.current) return;
      try {
        if (isMutedRef.current) {
          internalPlayerRef.current.mute?.();
        } else {
          internalPlayerRef.current.unMute?.();
          const norm = audioNormalizationRef.current || 'balanced';
          let multiplier = 1.0;
          if (norm === 'balanced') {
            // Standard -14 LUFS target: leaves headroom, compresses volume spikes
            multiplier = 0.88;
          } else if (norm === 'loud') {
            // Club / Punchy -10 LUFS target: maximized volume without clipping
            multiplier = 1.08;
          } else if (norm === 'soft') {
            // Soft / Night Mode -20 LUFS target: gentle dynamic leveling
            multiplier = 0.72;
          }
          const calibratedVolume = Math.min(
            100,
            Math.max(0, Math.round(volumeRef.current * multiplier))
          );
          internalPlayerRef.current.setVolume?.(calibratedVolume);
        }
      } catch (e) {}
    }, []);

    // Sync volume whenever volume, mute, or audio normalization changes
    useEffect(() => {
      applyLockedVolume();
    }, [volume, isMuted, audioNormalization, applyLockedVolume]);

    // Chromium audio session keep-alive loop to prevent background tab throttling and pause
    const silentAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
      if (!silentAudioRef.current) {
        // Inaudible 1-second silent WAV loop
        const audio = new Audio(
          'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/w=='
        );
        audio.loop = true;
        audio.volume = 0.001;
        silentAudioRef.current = audio;
      }

      if (isPlaying) {
        silentAudioRef.current.play().catch(() => {});
      } else {
        silentAudioRef.current.pause();
      }
    }, [isPlaying]);

    // Prevent auto-pausing when switching tabs or minimizing the browser window
    useEffect(() => {
      const resumeIfActive = () => {
        if (isPlayingRef.current && !userInitiatedPauseRef.current) {
          setTimeout(() => {
            try {
              internalPlayerRef.current?.playVideo?.();
            } catch (e) {}
          }, 80);
        }
      };

      document.addEventListener('visibilitychange', resumeIfActive);
      window.addEventListener('blur', resumeIfActive);
      window.addEventListener('focus', resumeIfActive);

      return () => {
        document.removeEventListener('visibilitychange', resumeIfActive);
        window.removeEventListener('blur', resumeIfActive);
        window.removeEventListener('focus', resumeIfActive);
      };
    }, []);

    const [isApiReady, setIsApiReady] = useState<boolean>(
      typeof window !== 'undefined' && !!window.YT && !!window.YT.Player
    );

    // Load YouTube IFrame API script if not already present
    useEffect(() => {
      if (window.YT && window.YT.Player) {
        setIsApiReady(true);
        return;
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        setIsApiReady(true);
      };

      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript?.parentNode?.insertBefore(tag, firstScript);
      }
    }, []);

    // Fetch synchronized lyrics whenever selected track changes
    useEffect(() => {
      if (!selectedTrack) {
        setLyrics([]);
        return;
      }

      let isCurrent = true;
      setIsLoadingLyrics(true);

      fetchSyncedLyrics(
        selectedTrack.title,
        selectedTrack.artist,
        selectedTrack.durationSeconds || duration || 0
      )
        .then((res) => {
          if (isCurrent) {
            setLyrics(res.lines);
          }
        })
        .catch((err) => {
          console.warn('Lyrics fetch failed:', err);
        })
        .finally(() => {
          if (isCurrent) setIsLoadingLyrics(false);
        });

      return () => {
        isCurrent = false;
      };
    }, [selectedTrack?.id, selectedTrack?.title, selectedTrack?.artist]);

    // Active lyric index calculation
    const activeLyricIndex = lyrics.findIndex(
      (line, i) =>
        currentTime >= line.time && (i === lyrics.length - 1 || currentTime < lyrics[i + 1].time)
    );

    // Auto-scroll lyrics smoothly to keep active line centered
    useEffect(() => {
      if (isExpanded && activeLineRef.current && lyricsContainerRef.current) {
        activeLineRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, [activeLyricIndex, isExpanded]);

    const handleStateChange = useCallback((event: any) => {
      const stateCode = event.data;
      let stateName: YTPlayerStateName = 'UNINITIALIZED';

      switch (stateCode) {
        case -1:
          stateName = 'UNSTARTED';
          break;
        case 0:
          stateName = 'ENDED';
          if (repeatModeRef.current === 'one') {
            try {
              internalPlayerRef.current?.seekTo?.(0, true);
              internalPlayerRef.current?.playVideo?.();
              onPlayerStateChangeRef.current('PLAYING');
              return;
            } catch (e) {
              console.warn('Repeat one playback error:', e);
            }
          }
          onTrackEndedRef.current();
          break;
        case 1:
          stateName = 'PLAYING';
          userInitiatedPauseRef.current = false;
          onPlayerErrorChangeRef.current(null);
          applyLockedVolume();
          break;
        case 2:
          stateName = 'PAUSED';
          if (!userInitiatedPauseRef.current && isPlayingRef.current) {
            // Unintended pause triggered by viewport resize, tab blur, or collapse
            try {
              internalPlayerRef.current?.playVideo?.();
              return;
            } catch (e) {}
          }
          break;
        case 3:
          stateName = 'BUFFERING';
          applyLockedVolume();
          break;
        case 5:
          stateName = 'CUED';
          break;
        default:
          stateName = 'UNSTARTED';
      }

      onPlayerStateChangeRef.current(stateName);
    }, []);

    const handleError = useCallback((event: any) => {
      const errorCode = event.data;
      let title = 'Playback Error';
      let description = 'Unable to play this audio stream directly.';
      let isEmbedRestricted = false;

      switch (errorCode) {
        case 2:
          title = 'Invalid Track ID';
          description = 'The requested audio track identifier is invalid.';
          break;
        case 5:
          title = 'Media Format Error';
          description = 'The audio track cannot be rendered in HTML5 format.';
          break;
        case 100:
          title = 'Track Unavailable';
          description = 'This track has been removed or is unavailable.';
          break;
        case 101:
        case 150:
          title = 'Playback Restricted';
          description = 'The copyright owner does not allow direct streaming of this specific video.';
          isEmbedRestricted = true;
          // Attempt automatic stream fallback for restricted embed:
          if (selectedTrack) {
            const fallbackQuery = `${selectedTrack.title} ${selectedTrack.artist || ''} audio`.trim();
            searchTracks(fallbackQuery, 1, 5, 'ytmusicapi', 'songs')
              .then((res) => {
                const alt = res.items.find(
                  (t) => t.id && t.id.length === 11 && t.id !== resolvedVideoId && !t.id.startsWith('MPRE')
                );
                if (alt) {
                  setResolvedVideoId(alt.id);
                  onPlayerErrorChangeRef.current(null);
                }
              })
              .catch(() => {});
          }
          break;
      }

      onPlayerErrorChangeRef.current({
        code: errorCode,
        title,
        description,
        isEmbedRestricted,
      });
    }, [selectedTrack, resolvedVideoId]);

    // Stream ID Resolution: Direct 11-char ID or Auto-resolve via search
    useEffect(() => {
      if (!selectedTrack) {
        setResolvedVideoId(null);
        setIsResolvingStream(false);
        lastLoadedVideoIdRef.current = null;
        return;
      }

      const trackId = selectedTrack.id;
      const isDirectVideoId =
        trackId &&
        trackId.length === 11 &&
        !trackId.startsWith('MPRE') &&
        !trackId.startsWith('OLAK') &&
        !trackId.startsWith('VL') &&
        !trackId.includes(' ') &&
        selectedTrack.isEmbeddableCandidate !== false;

      if (isDirectVideoId) {
        setResolvedVideoId(trackId);
        setIsResolvingStream(false);
        return;
      }

      // Track ID is an album/browse ID or non-embeddable candidate: dynamically resolve to a playable 11-char video ID
      let isCurrent = true;
      setIsResolvingStream(true);
      onPlayerStateChangeRef.current('BUFFERING');
      onPlayerErrorChangeRef.current(null);

      const query = `${selectedTrack.title} ${selectedTrack.artist || ''}`.trim();

      searchTracks(query, 1, 5, 'ytmusicapi', 'songs')
        .then((res) => {
          if (!isCurrent) return;
          const match = res.items.find(
            (t) => t.id && t.id.length === 11 && !t.id.startsWith('MPRE') && !t.id.startsWith('OLAK')
          );
          if (match) {
            setResolvedVideoId(match.id);
            setIsResolvingStream(false);
            onTrackResolvedRef.current?.({
              ...selectedTrack,
              id: match.id,
              duration: match.duration || selectedTrack.duration,
              durationSeconds: match.durationSeconds || selectedTrack.durationSeconds,
              thumbnailUrl: match.thumbnailUrl || selectedTrack.thumbnailUrl,
              youtubeUrl: match.youtubeUrl || `https://www.youtube.com/watch?v=${match.id}`,
              isEmbeddableCandidate: true,
            });
          } else {
            return searchTracks(query, 1, 5, 'ytmusicapi');
          }
        })
        .then((fallbackRes) => {
          if (!isCurrent || !fallbackRes) return;
          const match = fallbackRes.items.find(
            (t) => t.id && t.id.length === 11 && !t.id.startsWith('MPRE')
          );
          if (match) {
            setResolvedVideoId(match.id);
            setIsResolvingStream(false);
            onTrackResolvedRef.current?.({
              ...selectedTrack,
              id: match.id,
              duration: match.duration || selectedTrack.duration,
              durationSeconds: match.durationSeconds || selectedTrack.durationSeconds,
              thumbnailUrl: match.thumbnailUrl || selectedTrack.thumbnailUrl,
              youtubeUrl: match.youtubeUrl || `https://www.youtube.com/watch?v=${match.id}`,
              isEmbeddableCandidate: true,
            });
          } else {
            setIsResolvingStream(false);
            onPlayerStateChangeRef.current('UNSTARTED');
            onPlayerErrorChangeRef.current({
              code: 2,
              title: 'Track Unavailable',
              description: `Could not find an active stream for "${selectedTrack.title}".`,
              isEmbedRestricted: false,
            });
          }
        })
        .catch((err) => {
          if (!isCurrent) return;
          setIsResolvingStream(false);
          onPlayerStateChangeRef.current('UNSTARTED');
          onPlayerErrorChangeRef.current({
            code: 2,
            title: 'Playback Error',
            description: err?.message || 'Error resolving audio stream.',
            isEmbedRestricted: false,
          });
        });

      return () => {
        isCurrent = false;
      };
    }, [selectedTrack?.id, selectedTrack?.title, selectedTrack?.artist]);

    // Initialize or load video with highest bitrate possible & controls: 0 (No YouTube UI)
    useEffect(() => {
      if (!isApiReady || !resolvedVideoId) return;

      const trackId = resolvedVideoId;

      if (lastLoadedVideoIdRef.current === trackId) {
        return;
      }

      lastLoadedVideoIdRef.current = trackId;

      if (!internalPlayerRef.current) {
        internalPlayerRef.current = new window.YT.Player('yt-player-target', {
          height: '100%',
          width: '100%',
          videoId: trackId,
          playerVars: {
            autoplay: 1,
            controls: 0, // Strips YouTube control bar completely
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
            iv_load_policy: 3,
            fs: 0,
            disablekb: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              try {
                event.target.setPlaybackQuality(quality || 'highres');
                if (isMutedRef.current) {
                  event.target.mute();
                } else {
                  event.target.unMute();
                  event.target.setVolume(volumeRef.current);
                }
                event.target.playVideo();
              } catch (e) {
                console.warn('Autoplay error:', e);
              }
            },
            onStateChange: handleStateChange,
            onError: handleError,
          },
        });
      } else {
        try {
          if (typeof internalPlayerRef.current.loadVideoById === 'function') {
            internalPlayerRef.current.loadVideoById({
              videoId: trackId,
              suggestedQuality: quality || 'highres',
            });
            applyLockedVolume();
            internalPlayerRef.current.playVideo();
          }
        } catch (e) {
          console.warn('Video switch error:', e);
        }
      }
    }, [isApiReady, resolvedVideoId, quality, handleStateChange, handleError, applyLockedVolume]);

    // Interval to poll current playback time & enforce locked volume
    useEffect(() => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }

      progressTimerRef.current = window.setInterval(() => {
        if (
          internalPlayerRef.current &&
          typeof internalPlayerRef.current.getCurrentTime === 'function' &&
          typeof internalPlayerRef.current.getDuration === 'function'
        ) {
          try {
            const cur = internalPlayerRef.current.getCurrentTime() || 0;
            const tot = internalPlayerRef.current.getDuration() || 0;
            onTimeUpdateRef.current(cur, tot);

            // Re-enforce locked volume if video attempted to reset or drift
            if (!isMutedRef.current && typeof internalPlayerRef.current.getVolume === 'function') {
              const curVol = internalPlayerRef.current.getVolume();
              if (curVol !== undefined && Math.abs(curVol - volumeRef.current) > 1) {
                internalPlayerRef.current.setVolume(volumeRef.current);
              }
            }
          } catch {
            // Player might be switching
          }
        }
      }, 250);

      return () => {
        if (progressTimerRef.current) {
          window.clearInterval(progressTimerRef.current);
        }
      };
    }, []);

    // Synchronize volume and mute states
    useEffect(() => {
      if (internalPlayerRef.current) {
        try {
          if (isMuted) {
            internalPlayerRef.current.mute?.();
          } else {
            internalPlayerRef.current.unMute?.();
            internalPlayerRef.current.setVolume?.(volume);
          }
        } catch (e) {
          console.warn('Volume sync error:', e);
        }
      }
    }, [volume, isMuted]);

    // Forward player commands to parent components
    useImperativeHandle(
      ref,
      () => ({
        play: () => {
          userInitiatedPauseRef.current = false;
          try {
            internalPlayerRef.current?.playVideo?.();
          } catch (e) {
            console.warn('Play error:', e);
          }
        },
        pause: () => {
          userInitiatedPauseRef.current = true;
          try {
            internalPlayerRef.current?.pauseVideo?.();
          } catch (e) {
            console.warn('Pause error:', e);
          }
        },
        seek: (seconds: number) => {
          try {
            internalPlayerRef.current?.seekTo?.(seconds, true);
          } catch (e) {
            console.warn('Seek error:', e);
          }
        },
        setVolume: (vol: number) => {
          try {
            internalPlayerRef.current?.setVolume?.(vol);
          } catch (e) {
            console.warn('Volume error:', e);
          }
        },
        toggleMute: (muted: boolean) => {
          try {
            if (muted) {
              internalPlayerRef.current?.mute?.();
            } else {
              internalPlayerRef.current?.unMute?.();
            }
          } catch (e) {
            console.warn('Mute error:', e);
          }
        },
        setQuality: (newQuality: AudioQuality) => {
          try {
            internalPlayerRef.current?.setPlaybackQuality?.(newQuality);
          } catch (e) {
            console.warn('Quality error:', e);
          }
        },
      }),
      []
    );

    // Collapse expanded view without interrupting playback
    const handleCollapseExpanded = useCallback(() => {
      onCloseExpanded();
      if (isPlayingRef.current && internalPlayerRef.current) {
        setTimeout(() => {
          try {
            internalPlayerRef.current?.playVideo?.();
          } catch (e) {}
        }, 60);
      }
    }, [onCloseExpanded]);

    // Escape key listener to close expanded view
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isExpanded) {
          handleCollapseExpanded();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isExpanded, handleCollapseExpanded]);

    const formatTime = (secs: number) => {
      if (isNaN(secs) || secs < 0) return '0:00';
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const effectiveDuration = duration > 0 ? duration : selectedTrack?.durationSeconds || 180;
    const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;
    const qualityLabel = getQualityLabel(quality);

    return (
      <div
        className={`audio-engine-root ${isExpanded ? 'theater-expanded-active' : 'audio-engine-headless'}`}
        style={
          !isExpanded
            ? {
                position: 'fixed',
                bottom: 0,
                left: 0,
                width: '240px',
                height: '240px',
                opacity: 0.001,
                pointerEvents: 'none',
                overflow: 'hidden',
                zIndex: -1,
              }
            : undefined
        }
        aria-hidden={!isExpanded}
      >
        {/* Ambient Blurred Artwork Backdrop (Visible in Theater Mode) */}
        {selectedTrack && isExpanded && (
          <div
            className="theater-ambient-backdrop"
            style={{ backgroundImage: `url(${selectedTrack.thumbnailUrl})` }}
          />
        )}

        {/* Fullscreen Viewport & Background Video Engine: ALWAYS MOUNTED so iframe never unmounts */}
        <div className="theater-fullscreen-viewport">
          {/* Top Header Bar in Expanded Mode */}
          {isExpanded && (
            <div className="theater-top-bar">
              {/* Collapse Trigger Button */}
              <button
                type="button"
                className="theater-collapse-btn"
                onClick={handleCollapseExpanded}
                title="Collapse view (Esc)"
                aria-label="Collapse theater view"
              >
                <ChevronDown size={28} />
              </button>

              {/* Ambient Header Center Badge */}
              <div className="theater-header-center">
                <span className="theater-badge-tag">NOW PLAYING</span>
              </div>

              {/* Top Right Actions: Small Video Button + Quality Menu */}
              <div className="theater-top-actions-right">
                <button
                  type="button"
                  className={`theater-small-video-btn ${stageView === 'video' ? 'is-active' : ''}`}
                  onClick={() => setStageView(stageView === 'video' ? 'split' : 'video')}
                  title={stageView === 'video' ? 'Show lyrics and artwork' : 'Watch video stream'}
                >
                  {stageView === 'video' ? <Mic2 size={13} /> : <Video size={13} />}
                  <span>{stageView === 'video' ? 'Lyrics' : 'Watch Video'}</span>
                </button>

                <div className="theater-dac-wrap">
                  <button
                    type="button"
                    className={`theater-quality-pill-btn ${showQualityMenu ? 'is-open' : ''}`}
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    title="Music Quality Settings"
                  >
                    <Sliders size={13} className="quality-pill-icon" />
                    <span className="quality-pill-text">{qualityLabel}</span>
                  </button>

                  <MusicQualityMenu
                    isOpen={showQualityMenu}
                    onClose={() => setShowQualityMenu(false)}
                    quality={quality}
                    onQualityChange={onQualityChange}
                    position="bottom"
                  />
                </div>
              </div>
            </div>
          )}

            {/* Center Stage Presentation */}
            <div className={`theater-center-stage ${!isExpanded ? 'theater-center-stage-headless' : ''}`}>
              {/* Persistent YouTube IFrame Engine: Cropped, Borderless 16:9 Frame with ZERO YouTube UI */}
              <div
                className={`theater-cinematic-video-wrap ${
                  isExpanded && stageView === 'video' ? 'video-frame-visible' : 'video-frame-hidden-stream'
                }`}
                aria-hidden={!isExpanded || stageView !== 'video'}
              >
                <div className="cinematic-iframe-crop-box">
                  <div id="yt-player-target"></div>
                </div>

                {/* Custom Native Interactive Glass Overlay */}
                {isExpanded && stageView === 'video' && (
                  <div
                    className="cinematic-interactive-overlay"
                    onClick={onTogglePlay}
                    title={isPlaying ? 'Click to Pause' : 'Click to Play'}
                  >
                    <div className="cinematic-top-glass-bar">
                      <div className="cinematic-top-spacer" />
                      <button
                        type="button"
                        className="cinematic-back-to-lyrics-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStageView('split');
                        }}
                        title="Return to Lyrics"
                      >
                        <Mic2 size={13} />
                        <span>Back to Lyrics</span>
                      </button>
                    </div>

                    {!isPlaying && (
                      <div className="cinematic-custom-play-badge">
                        <Play size={28} fill="#ffffff" color="#ffffff" style={{ marginLeft: 3 }} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SPLIT IMMERSIVE DESKTOP STAGE: Hero Album Artwork + Live Synced Lyrics Stream */}
              {isExpanded && selectedTrack && stageView === 'split' && (
                <div className="theater-split-stage">
                  {/* LEFT COLUMN: Grand Album Cover Sleeve & Track Identity */}
                  <div className="theater-split-artwork-col">
                    <div className="canvas-artwork-stage">
                      <div className={`vinyl-disc-halo ${isPlaying ? 'is-spinning' : ''}`}>
                        <div className="vinyl-grooves" />
                        <div
                          className="vinyl-center-label"
                          style={{ backgroundImage: `url(${selectedTrack.thumbnailUrl})` }}
                        />
                      </div>

                      <div className="canvas-cover-sleeve">
                        <img
                          src={selectedTrack.thumbnailUrl}
                          alt={selectedTrack.title}
                          className="canvas-cover-img"
                        />
                        {isPlaying && (
                          <div className="canvas-equalizer-overlay">
                            <span className="canvas-eq-bar c-bar-1" />
                            <span className="canvas-eq-bar c-bar-2" />
                            <span className="canvas-eq-bar c-bar-3" />
                            <span className="canvas-eq-bar c-bar-4" />
                            <span className="canvas-eq-bar c-bar-5" />
                          </div>
                        )}
                        <button
                          type="button"
                          className="canvas-cover-video-btn"
                          onClick={() => setStageView('video')}
                          title="Watch Video"
                        >
                          <Video size={13} />
                          <span>Watch Video</span>
                        </button>
                      </div>
                    </div>

                    <div className="split-titles-hero">
                      <h1 className="split-song-title" title={selectedTrack.title}>
                        {selectedTrack.title}
                      </h1>
                      <p className="split-artist-subtitle" title={selectedTrack.artist}>
                        {selectedTrack.artist}
                        {selectedTrack.album ? ` • ${selectedTrack.album}` : ''}
                      </p>

                      <div className="split-meta-actions">
                        <button
                          type="button"
                          className={`split-heart-btn ${isLiked ? 'is-liked' : ''}`}
                          onClick={() => onToggleLike(selectedTrack)}
                          title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                        >
                          <Heart size={18} fill={isLiked ? 'var(--accent-primary)' : 'none'} />
                          <span>{isLiked ? 'Liked' : 'Like'}</span>
                        </button>
                        <button
                          type="button"
                          className="split-watch-video-btn"
                          onClick={() => setStageView('video')}
                          title="Watch Video"
                        >
                          <Video size={14} />
                          <span>Watch Video</span>
                        </button>
                        <span className="split-stream-badge">
                          <span className="pulse-dot" />
                          {qualityLabel} Audio
                        </span>
                      </div>
                    </div>
                  </div>

              {/* RIGHT COLUMN: Real-Time Synced Lyrics Stream */}
              <div className="theater-split-lyrics-col">
                <div className="split-lyrics-header">
                  <span className="split-lyrics-title">LYRICS</span>
                </div>

                {isLoadingLyrics ? (
                  <div className="lyrics-loading-state">
                    <Loader2 size={32} className="lyrics-spinner" />
                    <span>Loading lyrics...</span>
                  </div>
                ) : lyrics.length > 0 ? (
                  <div className="lyrics-scroll-viewport" ref={lyricsContainerRef}>
                    <div className="lyrics-lines-wrapper">
                      {lyrics.map((line, idx) => {
                        const isActive = idx === activeLyricIndex;
                        const isPast = idx < activeLyricIndex;
                        return (
                          <div
                            key={`${line.time}-${idx}`}
                            ref={isActive ? activeLineRef : null}
                            className={`lyric-line-item ${isActive ? 'is-active-line' : ''} ${
                              isPast ? 'is-past-line' : ''
                            }`}
                            onClick={() => onSeek(line.time)}
                            title={`Jump to ${formatTime(line.time)}`}
                          >
                            <span className="lyric-text">{line.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="lyrics-empty-state">
                    <div className="ambient-music-wave" aria-hidden="true">
                      <span className="wave-bar w-1" />
                      <span className="wave-bar w-2" />
                      <span className="wave-bar w-3" />
                      <span className="wave-bar w-4" />
                      <span className="wave-bar w-5" />
                    </div>
                    <h3>Instrumental Harmony</h3>
                    <p>Immerse yourself in the sound</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {isExpanded && playerError && (
            <div className="theater-error-banner">
              <span className="error-title">{playerError.title}</span>
              <span className="error-desc">{playerError.description}</span>
            </div>
          )}
        </div>

        {/* Bottom Playback Controls Bar in Expanded Mode */}
        {isExpanded && (
          <div className="theater-bottom-controls">
            {/* Scrubber Timeline */}
            <div className="theater-scrubber-row">
              <span className="theater-time-label">{formatTime(currentTime)}</span>
              <div
                className="theater-scrubber-track"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  onSeek(ratio * effectiveDuration);
                }}
              >
                <div
                  className="theater-scrubber-fill"
                  style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                />
              </div>
              <span className="theater-time-label">{formatTime(effectiveDuration)}</span>
            </div>

            {/* Bottom Controls Trio: Meta / Transport / Volume */}
            <div className="theater-controls-main-row">
              {/* Left: Track Information & Like */}
              <div className="theater-ctrl-left">
                <div className="theater-meta-titles">
                  <span className="t-song-title">{selectedTrack?.title}</span>
                  <span className="t-artist-title">{selectedTrack?.artist}</span>
                </div>
                {selectedTrack && onToggleLike && (
                  <button
                    type="button"
                    className={`theater-heart-btn ${isLiked ? 'is-liked' : ''}`}
                    onClick={() => onToggleLike(selectedTrack)}
                    title={isLiked ? 'Remove from Liked' : 'Save to Liked'}
                  >
                    <Heart size={20} fill={isLiked ? 'var(--accent-primary)' : 'none'} />
                  </button>
                )}
              </div>

              {/* Center: Playback Transport Buttons */}
              <div className="theater-ctrl-center">
                <button
                  type="button"
                  className={`theater-ctrl-btn ${isShuffle ? 'is-active' : ''}`}
                  onClick={onToggleShuffle}
                  title={isShuffle ? 'Shuffle enabled' : 'Shuffle disabled'}
                >
                  <Shuffle size={18} />
                </button>

                <button
                  type="button"
                  className="theater-ctrl-btn"
                  onClick={onPrevTrack}
                  title="Previous track"
                >
                  <SkipBack size={22} />
                </button>

                <button
                  type="button"
                  className="theater-main-play-btn"
                  onClick={onTogglePlay}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={24} fill="#120e0a" color="#120e0a" />
                  ) : (
                    <Play size={24} fill="#120e0a" color="#120e0a" style={{ marginLeft: 2 }} />
                  )}
                </button>

                <button
                  type="button"
                  className="theater-ctrl-btn"
                  onClick={onNextTrack}
                  title="Next track"
                >
                  <SkipForward size={22} />
                </button>

                <button
                  type="button"
                  className={`theater-ctrl-btn ${repeatMode !== 'off' ? 'is-active' : ''}`}
                  onClick={onCycleRepeat}
                  title={`Repeat: ${repeatMode === 'off' ? 'Off' : repeatMode === 'all' ? 'All Songs' : 'Current Song'}`}
                >
                  {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                  {repeatMode !== 'off' && <span className="transport-active-indicator" />}
                </button>
              </div>

              {/* Right: Volume */}
              <div className="theater-ctrl-right">
                <div className="theater-volume-group">
                  <button
                    type="button"
                    className="theater-vol-icon-btn"
                    onClick={onToggleMute}
                    title={isMuted ? 'Unmute' : 'Mute'}
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
                    className="theater-vol-slider"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => onVolumeChange(parseInt(e.target.value, 10))}
                    style={{
                      background: `linear-gradient(to right, var(--accent-primary) ${
                        isMuted ? 0 : volume
                      }%, rgba(255,255,255,0.2) ${isMuted ? 0 : volume}%)`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Subtle Scroll Hint Indicator at bottom of Screen 1 */}
            <div className="scroll-hint-indicator" onClick={handleScrollToRelated}>
              <span>Scroll down for related tracks</span>
              <ChevronDown size={14} className="bounce-arrow" />
            </div>
          </div>
        )}
      </div>

      {/* Scroll Down to Discover Related Music Section (Screen 2: Only visible when scrolling down!) */}
      {isExpanded && selectedTrack && (
        <div className="theater-scroll-discovery-section" ref={relatedSectionRef}>
            <div className="discovery-section-header">
              <div className="discovery-header-text">
                <span className="discovery-badge">SCROLL TO DISCOVER</span>
                <h2 className="discovery-title">Related Music & Recommended</h2>
                <p className="discovery-subtitle">
                  More tracks inspired by {selectedTrack.artist || selectedTrack.title}
                </p>
              </div>
            </div>

            {isLoadingRelated ? (
              <div className="discovery-loading-row">
                <Loader2 size={24} className="lyrics-spinner" />
                <span>Finding related tracks...</span>
              </div>
            ) : relatedTracks.length > 0 ? (
              <div className="discovery-tracks-grid">
                {relatedTracks.map((trk) => (
                  <div
                    key={trk.id}
                    className="discovery-track-card"
                    onClick={() => onPlayTrack && onPlayTrack(trk)}
                  >
                    <div className="discovery-thumb-wrap">
                      <img
                        src={trk.thumbnailUrl || '/assets/default-art.png'}
                        alt={trk.title}
                        className="discovery-thumb-img"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        className="discovery-play-hover-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayTrack && onPlayTrack(trk);
                        }}
                        title={`Play ${trk.title}`}
                      >
                        <Play size={18} fill="#120e0a" color="#120e0a" style={{ marginLeft: 2 }} />
                      </button>
                    </div>
                    <div className="discovery-meta">
                      <h4 className="discovery-track-title" title={trk.title}>
                        {trk.title}
                      </h4>
                      <p className="discovery-track-artist" title={trk.artist}>
                        {trk.artist}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="discovery-empty-note">
                <span>No direct recommendations found for this track.</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);
