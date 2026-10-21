import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Flame, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { HomeView } from './components/HomeView';
import { PlaylistView } from './components/PlaylistView';
import { LibraryView } from './components/LibraryView';
import { BottomPlayer } from './components/BottomPlayer';
import { QueueDrawer } from './components/QueueDrawer';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { SpotifyImportModal } from './components/SpotifyImportModal';
import { Toast, type ToastMessage } from './components/Toast';
import { SearchBar } from './components/SearchBar';
import { TrackList } from './components/TrackList';
import { PlayerTestPanel, type PlayerHandle } from './components/PlayerTestPanel';
import { MiniPlayerPopup } from './components/MiniPlayerPopup';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SettingsView } from './components/SettingsView';
import { AuthModal } from './components/AuthModal';
import type {
  MusicTrack,
  YTPlayerStateName,
  PlayerErrorInfo,
  SearchFilterType,
  Playlist,
  ThemePalette,
  RepeatMode,
  ViewType,
  AudioQuality,
  AudioNormalizationMode,
  UserProfile,
  PlaybackSession,
} from './types';
import {
  checkBackendHealth,
  searchTracks,
  ApiError,
} from './services/api';
import {
  loadPlaylists,
  savePlaylists,
  loadLikedTracks,
  saveLikedTracks,
  loadRecentTracks,
  saveRecentTracks,
  loadPinnedPlaylists,
  savePinnedPlaylists,
  loadTheme,
  saveTheme,
  loadVolume,
  saveVolume,
  loadAudioQuality,
  saveAudioQuality,
  loadMusicLanguage,
  saveMusicLanguage,
  loadAudioNormalization,
  saveAudioNormalization,
  loadSearchHistory,
  saveSearchQuery,
  clearSearchHistory,
  addRecentArtist,
  getUserTasteProfile,
  loadCurrentUser,
  saveCurrentUser,
  logoutUser,
  loadPlaybackSession,
  savePlaybackSession,
  clearPlaybackSession,
  syncUserDataFromCloud,
  syncUserDataToCloud,
  listenToCrossTabSync,
} from './services/storage';
import {
  isFirebaseConfigured,
  getDeviceId,
  onAuthStateSubscription,
  subscribeToUserCloudData,
  syncPlaybackSessionToFirestore,
} from './services/firebase';
import {
  generateAlgorithmicMixes,
  getCachedAutoMixes,
  filterMusicTracks,
} from './services/autoMixes';

export function App() {
  // Navigation & View State
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [viewHistory, setViewHistory] = useState<{ view: ViewType; playlistId?: string }[]>([
    { view: 'home' },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Appearance & Themes
  const [theme, setTheme] = useState<ThemePalette>(() => loadTheme());

  // Recommendation & Taste Engine State for Home
  const [musicLanguage, setMusicLanguage] = useState<string>(() => loadMusicLanguage());
  const [languageTracks, setLanguageTracks] = useState<MusicTrack[]>([]);
  const [isLanguageLoading, setIsLanguageLoading] = useState<boolean>(false);
  const [madeForYouTracks, setMadeForYouTracks] = useState<MusicTrack[]>([]);
  const [searchRecTracks, setSearchRecTracks] = useState<MusicTrack[]>([]);
  const [searchRecQuery, setSearchRecQuery] = useState<string | null>(null);
  const [themeTracks, setThemeTracks] = useState<MusicTrack[]>([]);

  // Real Algorithmic Auto Mixes (Never fake cards, always algorithm)
  const [autoMixes, setAutoMixes] = useState<Playlist[]>(() => getCachedAutoMixes(loadMusicLanguage()));

  // User Authentication State (Google & Phone OTP)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => loadCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authReason, setAuthReason] = useState<string | undefined>(undefined);
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Collections State (Scoped strictly to current active user account)
  const [playlists, setPlaylists] = useState<Playlist[]>(() => loadPlaylists(loadCurrentUser()?.id));
  const [likedTracks, setLikedTracks] = useState<MusicTrack[]>(() => loadLikedTracks(loadCurrentUser()?.id));
  const [recentTracks, setRecentTracks] = useState<MusicTrack[]>(() => loadRecentTracks(loadCurrentUser()?.id));
  const [pinnedPlaylistIds, setPinnedPlaylistIds] = useState<Set<string>>(() =>
    loadPinnedPlaylists(loadCurrentUser()?.id)
  );
  const [newReleases, setNewReleases] = useState<MusicTrack[]>([]);

  // Toast Notification State
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Search State
  const [query, setQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<SearchFilterType>('all');
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Continuous Cross-Device Sync State (Listening notice from another phone or laptop)
  const [remoteSessionNotice, setRemoteSessionNotice] = useState<PlaybackSession | null>(null);

  // Continuous Playback Persistence State
  const initialPlaybackSession = useRef<PlaybackSession | null>(loadPlaybackSession());
  const [initialStartTime, setInitialStartTime] = useState<number>(() => {
    return initialPlaybackSession.current?.currentTime || 0;
  });

  // Playback & Queue State (Restored continuously from previous session if exists)
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(
    () => initialPlaybackSession.current?.track || null
  );
  const [queue, setQueue] = useState<MusicTrack[]>(
    () => initialPlaybackSession.current?.queue || []
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playerState, setPlayerState] = useState<YTPlayerStateName>('UNINITIALIZED');
  const [playerError, setPlayerError] = useState<PlayerErrorInfo | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(
    () => initialPlaybackSession.current?.currentTime || 0
  );
  const [duration, setDuration] = useState<number>(
    () => initialPlaybackSession.current?.duration || 0
  );
  const [volume, setVolume] = useState<number>(() => loadVolume());
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => {
    try {
      const saved = localStorage.getItem('seeder_repeat_mode');
      if (saved === 'all' || saved === 'one' || saved === 'off') return saved as RepeatMode;
    } catch (e) {}
    return 'off';
  });
  const [audioQuality, setAudioQuality] = useState<AudioQuality>(() => loadAudioQuality());
  const [audioNormalization, setAudioNormalization] = useState<AudioNormalizationMode>(
    () => loadAudioNormalization()
  );

  // Panels & Drawers & Expanded Theater
  const [showQueue, setShowQueue] = useState<boolean>(false);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<MusicTrack | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isSpotifyImportModalOpen, setIsSpotifyImportModalOpen] = useState<boolean>(false);
  const [spotifyImportTargetPlaylistId, setSpotifyImportTargetPlaylistId] = useState<string | null>(null);
  const [isExpandedView, setIsExpandedView] = useState<boolean>(false);

  const handleOpenSpotifyImport = (targetPlaylistId?: string | null) => {
    setSpotifyImportTargetPlaylistId(targetPlaylistId || null);
    setIsSpotifyImportModalOpen(true);
  };

  const playerRef = useRef<PlayerHandle | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // State refs for continuous session saving on beforeunload / pagehide
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const lastSavedSessionTimeRef = useRef<number>(0);

  const handleQualityChange = (newQuality: AudioQuality) => {
    setAudioQuality(newQuality);
    saveAudioQuality(newQuality);
    playerRef.current?.setQuality(newQuality);
    showToast(`Bitrate preference set to ${newQuality.toUpperCase()}`);
  };

  const handleNormalizationChange = (mode: AudioNormalizationMode) => {
    setAudioNormalization(mode);
    saveAudioNormalization(mode);
    showToast(`Audio normalization set to ${mode.toUpperCase()}`);
  };

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  // Disable right-click context menu throughout the app as requested
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Synchronize account-specific likes, library playlists, and listening history whenever active account changes
  useEffect(() => {
    const acId = currentUser?.id || null;
    setPlaylists(loadPlaylists(acId));
    setLikedTracks(loadLikedTracks(acId));
    setRecentTracks(loadRecentTracks(acId));
  }, [currentUser?.id]);

  // Initial health check and fetch new releases for home
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        await checkBackendHealth();
      } catch (e) {
        console.warn('Backend connecting...', e);
      }

      try {
        const nr = await searchTracks('New Releases', 1, 14, 'ytmusicapi', 'new_releases');
        const clean = filterMusicTracks(nr.items);
        if (isMounted && clean.length > 0) {
          setNewReleases(clean);
        }
      } catch (err) {
        console.warn('Could not fetch new releases:', err);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Real Living Algorithmic Auto Mixes Generator (Always algorithm, never fake cards)
  useEffect(() => {
    let isMounted = true;
    const taste = getUserTasteProfile(likedTracks, recentTracks);

    generateAlgorithmicMixes(taste, likedTracks, musicLanguage)
      .then((generatedMixes) => {
        if (isMounted && generatedMixes.length > 0) {
          setAutoMixes(generatedMixes);
        }
      })
      .catch((err) => {
        console.warn('Algorithmic auto-mixes generation error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [likedTracks, recentTracks, musicLanguage]);

  // 0. Smart "Made For You" Recommendation Algorithm (Taste + Likings + Language)
  useEffect(() => {
    let isMounted = true;
    const taste = getUserTasteProfile(likedTracks, recentTracks);

    let queryTarget = 'Trending Hits';
    if (musicLanguage && musicLanguage !== 'all') {
      if (taste.length >= 1) {
        queryTarget = `${taste[0]} ${musicLanguage} songs`;
      } else {
        queryTarget = `${musicLanguage} top hits songs`;
      }
    } else if (taste.length >= 2) {
      queryTarget = `${taste[0]} ${taste[1]} hits`;
    } else if (taste.length === 1) {
      queryTarget = `${taste[0]} songs`;
    }

    searchTracks(queryTarget, 1, 14, 'ytmusicapi', 'songs')
      .then((res) => {
        const clean = filterMusicTracks(res.items);
        if (isMounted && clean.length > 0) {
          setMadeForYouTracks(clean);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch Made For You tracks:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [likedTracks, recentTracks, musicLanguage]);

  // 1. Language & Regional Recommendation Engine (Syncs trending & new releases)
  useEffect(() => {
    let isMounted = true;
    setIsLanguageLoading(true);

    const languageQueryMap: Record<string, string> = {
      malayalam: 'Malayalam Hits Top Songs',
      hindi: 'Trending Hindi Bollywood Hits',
      tamil: 'Latest Tamil Top Songs Anirudh',
      telugu: 'Trending Telugu Hits Tollywood',
      punjabi: 'Punjabi Hot Hits Top Songs',
      kannada: 'Latest Kannada Hits Songs',
      bengali: 'Trending Bengali Hits Songs',
      english: 'Top Global Pop Hits',
      synthwave: 'Synthwave Midnight Beats',
      lofi: 'Lo-Fi Chill Beats',
      all: 'Trending Global Music Charts',
      music: 'Trending Popular Hits Songs',
      podcasts: 'Popular English Hindi Malayalam Podcasts',
    };

    const targetQuery = languageQueryMap[musicLanguage] || 'Trending Global Music Charts';

    searchTracks(targetQuery, 1, 14, 'ytmusicapi', 'songs')
      .then((res) => {
        const clean = filterMusicTracks(res.items);
        if (isMounted && clean.length > 0) {
          setLanguageTracks(clean);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch language tracks:', err);
      })
      .finally(() => {
        if (isMounted) setIsLanguageLoading(false);
      });

    // Also adapt New Releases shelf to selected language
    if (musicLanguage && musicLanguage !== 'all') {
      const langReleasesMap: Record<string, string> = {
        malayalam: 'Malayalam new songs releases',
        hindi: 'Latest Hindi Bollywood new songs',
        tamil: 'New Tamil songs releases Anirudh',
        telugu: 'New Telugu songs releases Tollywood',
        punjabi: 'Latest Punjabi songs releases',
        kannada: 'Latest Kannada new songs',
        bengali: 'Latest Bengali new songs',
        english: 'New English Pop releases songs',
        synthwave: 'New Synthwave releases',
        lofi: 'New Lo-Fi chill releases',
        music: 'Trending Hits new releases',
      };
      const relQuery = langReleasesMap[musicLanguage] || `${musicLanguage} new songs`;
      searchTracks(relQuery, 1, 14, 'ytmusicapi', 'songs')
        .then((res) => {
          const clean = filterMusicTracks(res.items);
          if (isMounted && clean.length > 0) {
            setNewReleases(clean);
          }
        })
        .catch((e) => console.warn('Language new releases fetch:', e));
    }

    return () => {
      isMounted = false;
    };
  }, [musicLanguage]);

  // 2. Search History & Taste Recommendation Engine
  useEffect(() => {
    let isMounted = true;
    const history = loadSearchHistory();
    const candidateQuery =
      history.length > 0
        ? history[0]
        : likedTracks.length > 0
        ? likedTracks[0].artist
        : 'Sid Sriram';

    if (!candidateQuery) return;
    setSearchRecQuery(candidateQuery);

    searchTracks(candidateQuery, 1, 14, 'ytmusicapi', 'songs')
      .then((res) => {
        const clean = filterMusicTracks(res.items);
        if (isMounted && clean.length > 0) {
          setSearchRecTracks(clean);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch search recommendations:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [query, likedTracks]);

  // 3. Theme-Adaptive Mood Recommendation
  useEffect(() => {
    let isMounted = true;
    const themeQueryMap: Record<ThemePalette, string> = {
      noir: 'Midnight Ambient Lo-Fi Beats',
      cyber: 'Cyberpunk Synthwave Electro',
      amber: 'Warm Acoustic Soulful Indie',
      aurora: 'Dream Pop Ambient Indie',
    };

    const tQuery = themeQueryMap[theme] || 'Indie Chill';
    searchTracks(tQuery, 1, 14, 'ytmusicapi', 'songs')
      .then((res) => {
        const clean = filterMusicTracks(res.items);
        if (isMounted && clean.length > 0) {
          setThemeTracks(clean);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch theme tracks:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [theme]);

  // Update Liked set
  const likedTrackIds = new Set(likedTracks.map((t) => t.id));

  // Navigation handlers
  const navigateTo = (view: ViewType, playlistId?: string) => {
    setCurrentView(view);
    if (playlistId !== undefined) {
      setSelectedPlaylistId(playlistId);
    }

    const nextHistory = viewHistory.slice(0, historyIndex + 1);
    nextHistory.push({ view, playlistId });
    setViewHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const prev = viewHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentView(prev.view);
      setSelectedPlaylistId(prev.playlistId || null);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < viewHistory.length - 1) {
      const next = viewHistory[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentView(next.view);
      setSelectedPlaylistId(next.playlistId || null);
    }
  };

  // Toast Helper
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ id: `${Date.now()}-${Math.random()}`, text, type });
  };

  // Search execution
  const performSearch = useCallback(
    async (
      searchQuery: string,
      filterType: SearchFilterType = selectedFilter,
      pageNum: number = 1,
      append: boolean = false
    ) => {
      if (!searchQuery.trim() && filterType !== 'new_releases') return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setSearchError(null);
      }

      try {
        const result = await searchTracks(
          searchQuery,
          pageNum,
          20,
          'ytmusicapi',
          filterType,
          controller.signal
        );

        setSearchResults((prev) => (append ? [...prev, ...result.items] : result.items));
        setHasMore(result.hasMore);
        setPage(pageNum);
        setQuery(searchQuery);

        if (result.items.length > 0) {
          saveSearchQuery(searchQuery);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;

        const isApiErr = err instanceof ApiError;
        const msg = isApiErr ? err.message : 'An error occurred during search';
        setSearchError(msg);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [selectedFilter]
  );

  // Playback Control Handlers
  const handlePlayTrack = (track: MusicTrack, newQueue?: MusicTrack[]) => {
    setInitialStartTime(0);
    setCurrentTrack(track);
    setIsPlaying(true);
    setPlayerError(null);

    // Track history & artist preference (scoped per account)
    setRecentTracks((prev) => {
      const updated = [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 20);
      saveRecentTracks(updated, currentUser?.id);
      return updated;
    });
    if (track.artist) {
      addRecentArtist(track.artist);
    }

    // Queue setup
    if (newQueue && newQueue.length > 0) {
      const idx = newQueue.findIndex((t) => t.id === track.id);
      const remaining = idx >= 0 ? newQueue.slice(idx + 1) : newQueue.filter((t) => t.id !== track.id);
      setQueue(remaining);
    }

    if (currentTrack?.id === track.id && playerRef.current) {
      playerRef.current.play();
    }
  };

  const handlePlayPlaylist = (playlist: Playlist, startIndex: number = 0) => {
    if (playlist.tracks.length === 0) {
      showToast('Playlist is empty', 'info');
      return;
    }
    const track = playlist.tracks[startIndex] || playlist.tracks[0];
    handlePlayTrack(track, playlist.tracks);
  };

  const handleTogglePlay = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      playerRef.current?.pause();
      setIsPlaying(false);
    } else {
      playerRef.current?.play();
      setIsPlaying(true);
    }
  };

  const handleNextTrack = (isManualSkip: boolean = true) => {
    if (!isManualSkip && repeatMode === 'one') {
      playerRef.current?.seek(0);
      playerRef.current?.play();
      return;
    }

    if (queue.length > 0) {
      let nextIndex = 0;
      if (isShuffle) {
        nextIndex = Math.floor(Math.random() * queue.length);
      }
      const nextTrack = queue[nextIndex];
      let nextQueue = queue.filter((_, i) => i !== nextIndex);
      if (repeatMode === 'all' && currentTrack) {
        nextQueue = [...nextQueue, currentTrack];
      }
      setCurrentTrack(nextTrack);
      setQueue(nextQueue);
      setIsPlaying(true);
      playerRef.current?.play();
    } else if (repeatMode === 'all' && currentTrack) {
      playerRef.current?.seek(0);
      playerRef.current?.play();
    } else {
      showToast('Reached end of queue', 'info');
      setIsPlaying(false);
    }
  };

  const handleTrackEnded = () => {
    handleNextTrack(false);
  };

  const handlePrevTrack = () => {
    if (currentTime > 3) {
      playerRef.current?.seek(0);
    } else {
      if (recentTracks.length > 1) {
        const prev = recentTracks[1];
        handlePlayTrack(prev);
      } else {
        playerRef.current?.seek(0);
      }
    }
  };

  const handleSeek = (seconds: number) => {
    playerRef.current?.seek(seconds);
    setCurrentTime(seconds);
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    saveVolume(vol);
    if (isMuted && vol > 0) {
      setIsMuted(false);
    }
    playerRef.current?.setVolume(vol);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    playerRef.current?.toggleMute(nextMuted);
  };

  const handleCycleRepeat = () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentIdx = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    setRepeatMode(nextMode);
    try {
      localStorage.setItem('seeder_repeat_mode', nextMode);
    } catch (e) {}
    const labels: Record<RepeatMode, string> = {
      off: 'Repeat: Off',
      all: 'Repeat: All Songs',
      one: 'Repeat: Current Track',
    };
    showToast(labels[nextMode], 'info');
  };

  // Continuous Playback Session Sync Listeners
  useEffect(() => {
    const saveStateOnLeave = () => {
      if (currentTrackRef.current) {
        savePlaybackSession({
          track: currentTrackRef.current,
          currentTime: currentTimeRef.current,
          duration: durationRef.current,
          queue: queueRef.current,
          savedAt: Date.now(),
          isPlaying: isPlayingRef.current,
        });
      }
    };
    window.addEventListener('beforeunload', saveStateOnLeave);
    window.addEventListener('pagehide', saveStateOnLeave);
    return () => {
      window.removeEventListener('beforeunload', saveStateOnLeave);
      window.removeEventListener('pagehide', saveStateOnLeave);
    };
  }, []);

  // Show friendly notification if continuous playback session was restored
  useEffect(() => {
    if (initialPlaybackSession.current?.track && (initialPlaybackSession.current.currentTime || 0) > 0) {
      const cur = Math.floor(initialPlaybackSession.current.currentTime);
      const mins = Math.floor(cur / 60);
      const secs = (cur % 60).toString().padStart(2, '0');
      showToast(`Resumed "${initialPlaybackSession.current.track.title}" from ${mins}:${secs}`, 'info');
    }
  }, []);

  // User Auth Actions & Handlers with Real-Time Cloud Sync
  const handleLoginSuccess = (
    user: UserProfile,
    cloudPlaylists?: Playlist[],
    cloudLikedTracks?: MusicTrack[]
  ) => {
    setCurrentUser(user);
    saveCurrentUser(user);

    // Load or apply account-specific library, likes, and listening history
    const userPl =
      cloudPlaylists && cloudPlaylists.length > 0
        ? cloudPlaylists
        : loadPlaylists(user.id);
    const userLk =
      cloudLikedTracks && cloudLikedTracks.length > 0
        ? cloudLikedTracks
        : loadLikedTracks(user.id);
    const userRecent = loadRecentTracks(user.id);

    setPlaylists(userPl);
    savePlaylists(userPl, user.id);
    setLikedTracks(userLk);
    saveLikedTracks(userLk, user.id);
    setRecentTracks(userRecent);
    setPinnedPlaylistIds(loadPinnedPlaylists(user.id));

    showToast(`Signed in as ${user.displayName}`, 'success');
    if (pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      setTimeout(() => action(), 150);
    }
  };

  // Firebase Auth State Subscription (Sync on login / token refresh)
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const unsubscribeAuth = onAuthStateSubscription((fbUser) => {
      if (fbUser) {
        setCurrentUser(fbUser);
        saveCurrentUser(fbUser);
      }
    });
    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  // Cloud Synchronization: Real-Time Firestore & Cross-Device Sync
  useEffect(() => {
    if (!currentUser?.id) return;

    // 1. Initial hydrate from cloud
    syncUserDataFromCloud(currentUser.id).then((cloudData) => {
      if (cloudData) {
        if (Array.isArray(cloudData.playlists) && cloudData.playlists.length > 0) {
          setPlaylists(cloudData.playlists);
          savePlaylists(cloudData.playlists);
        }
        if (Array.isArray(cloudData.likedTracks) && cloudData.likedTracks.length > 0) {
          setLikedTracks(cloudData.likedTracks);
          saveLikedTracks(cloudData.likedTracks);
        }
        if (
          cloudData.playbackSession?.track?.id &&
          cloudData.playbackSession.deviceId !== getDeviceId() &&
          Date.now() - (cloudData.playbackSession.savedAt || 0) < 86400000
        ) {
          setRemoteSessionNotice(cloudData.playbackSession);
        }
      }
    });

    // 2. Real-time Firestore snapshot subscription
    let unsubscribeFirestore: (() => void) | null = null;
    if (isFirebaseConfigured()) {
      unsubscribeFirestore = subscribeToUserCloudData(currentUser.id, (cloudData) => {
        if (Array.isArray(cloudData.playlists) && cloudData.playlists.length > 0) {
          setPlaylists(cloudData.playlists);
          savePlaylists(cloudData.playlists);
        }
        if (Array.isArray(cloudData.likedTracks) && cloudData.likedTracks.length > 0) {
          setLikedTracks(cloudData.likedTracks);
          saveLikedTracks(cloudData.likedTracks);
        }
        // Continuous playback sync from another device
        if (
          cloudData.playbackSession?.track?.id &&
          cloudData.playbackSession.deviceId !== getDeviceId() &&
          Date.now() - (cloudData.playbackSession.savedAt || 0) < 86400000
        ) {
          setRemoteSessionNotice(cloudData.playbackSession);
        }
      });
    }

    // 3. Focus & cross-tab sync fallback
    const handleFocus = () => {
      if (currentUser?.id) {
        syncUserDataFromCloud(currentUser.id).then((cloudData) => {
          if (cloudData) {
            if (Array.isArray(cloudData.playlists) && cloudData.playlists.length > 0) {
              setPlaylists(cloudData.playlists);
            }
            if (Array.isArray(cloudData.likedTracks) && cloudData.likedTracks.length > 0) {
              setLikedTracks(cloudData.likedTracks);
            }
          }
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    const unsubscribeSync = listenToCrossTabSync(() => {
      const storedUser = loadCurrentUser();
      setCurrentUser(storedUser);
      if (storedUser?.id) {
        syncUserDataFromCloud(storedUser.id).then((cloudData) => {
          if (cloudData) {
            if (Array.isArray(cloudData.playlists)) {
              setPlaylists(cloudData.playlists);
            }
            if (Array.isArray(cloudData.likedTracks)) {
              setLikedTracks(cloudData.likedTracks);
            }
          }
        });
      }
    });

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      window.removeEventListener('focus', handleFocus);
      unsubscribeSync();
    };
  }, [currentUser?.id]);

  // Periodic Playback Session Push to Cloud Firestore (every 10s while active)
  useEffect(() => {
    if (!isPlaying || !currentTrack || !currentUser?.id || !isFirebaseConfigured()) return;
    const interval = setInterval(() => {
      syncPlaybackSessionToFirestore(currentUser.id, {
        track: currentTrack,
        currentTime: currentTimeRef.current,
        duration: durationRef.current,
        queue: queueRef.current,
        savedAt: Date.now(),
        isPlaying: true,
        deviceId: getDeviceId(),
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack?.id, currentUser?.id]);

  const handleLogout = () => {
    // 1. Immediately stop all music and video playback completely
    try {
      playerRef.current?.stop?.();
      playerRef.current?.pause();
    } catch (e) {
      console.warn('Error stopping player on logout:', e);
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setPlayerState('UNSTARTED');
    setCurrentTime(0);
    setDuration(0);
    setQueue([]);
    queueRef.current = [];
    clearPlaybackSession();

    // 2. Clear current user authentication
    logoutUser();
    setCurrentUser(null);

    // 3. Reset library, likes, and listening history to clean guest state
    const guestPlaylists = loadPlaylists(null);
    const guestLikes = loadLikedTracks(null);
    const guestRecent = loadRecentTracks(null);
    setPlaylists(guestPlaylists);
    setLikedTracks(guestLikes);
    setRecentTracks(guestRecent);
    setPinnedPlaylistIds(loadPinnedPlaylists(null));

    showToast('Signed out of your account. Playback stopped.', 'info');
  };

  const handleOpenCreateModal = () => {
    if (!currentUser) {
      setAuthReason('Sign in with Google or Phone to create and save personal playlists');
      pendingActionRef.current = () => setIsCreateModalOpen(true);
      setIsAuthModalOpen(true);
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handleOpenAddToPlaylist = (track: MusicTrack) => {
    if (!currentUser) {
      setAuthReason('Sign in with Google or Phone to add tracks to your playlists');
      pendingActionRef.current = () => setAddToPlaylistTrack(track);
      setIsAuthModalOpen(true);
      return;
    }
    setAddToPlaylistTrack(track);
  };

  // Liked Songs Management (Auth-Gated)
  const handleToggleLike = (track: MusicTrack) => {
    if (!currentUser) {
      setAuthReason('Sign in with Google or Phone to save songs to your Liked Songs collection');
      pendingActionRef.current = () => handleToggleLike(track);
      setIsAuthModalOpen(true);
      return;
    }
    const isAlreadyLiked = likedTrackIds.has(track.id);
    let updated: MusicTrack[];
    if (isAlreadyLiked) {
      updated = likedTracks.filter((t) => t.id !== track.id);
      showToast(`Removed "${track.title}" from Liked Songs`, 'info');
    } else {
      updated = [track, ...likedTracks];
      showToast(`Saved "${track.title}" to Liked Songs`);
    }
    setLikedTracks(updated);
    saveLikedTracks(updated);
    if (currentUser?.id) {
      syncUserDataToCloud(currentUser.id, playlists, updated);
    }
  };

  // Synchronize resolved playable stream information
  const handleTrackResolved = (resolvedTrack: MusicTrack) => {
    setCurrentTrack(resolvedTrack);
    setLikedTracks((prev) => {
      const idx = prev.findIndex(
        (t) =>
          t.id === resolvedTrack.id ||
          (t.title.toLowerCase() === resolvedTrack.title.toLowerCase() &&
            t.artist.toLowerCase() === resolvedTrack.artist.toLowerCase())
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...resolvedTrack };
        saveLikedTracks(updated);
        if (currentUser?.id) {
          syncUserDataToCloud(currentUser.id, playlists, updated);
        }
        return updated;
      }
      return prev;
    });

    setPlaylists((prev) => {
      let changed = false;
      const updated = prev.map((pl) => {
        const trackIdx = pl.tracks.findIndex(
          (t) =>
            t.id === resolvedTrack.id ||
            (t.title.toLowerCase() === resolvedTrack.title.toLowerCase() &&
              t.artist.toLowerCase() === resolvedTrack.artist.toLowerCase())
        );
        if (trackIdx >= 0) {
          changed = true;
          const newTracks = [...pl.tracks];
          newTracks[trackIdx] = { ...newTracks[trackIdx], ...resolvedTrack };
          return { ...pl, tracks: newTracks };
        }
        return pl;
      });
      if (changed) {
        savePlaylists(updated);
        if (currentUser?.id) {
          syncUserDataToCloud(currentUser.id, updated, likedTracks);
        }
      }
      return updated;
    });
  };

  // Custom Playlists Management (Auth-Gated & Cloud-Synced)
  const handleCreatePlaylist = (name: string, initialTrack?: MusicTrack) => {
    if (!currentUser) {
      setAuthReason('Sign in with Google or Phone to create and manage personal playlists');
      pendingActionRef.current = () => handleCreatePlaylist(name, initialTrack);
      setIsAuthModalOpen(true);
      return;
    }
    const newPlaylist: Playlist = {
      id: `playlist-${Date.now()}`,
      name,
      description: 'Custom user created playlist',
      coverUrl: initialTrack?.thumbnailUrl,
      createdAt: new Date().toISOString(),
      isCustom: true,
      tracks: initialTrack ? [initialTrack] : [],
    };

    const updated = [newPlaylist, ...playlists];
    setPlaylists(updated);
    savePlaylists(updated);
    if (currentUser?.id) {
      syncUserDataToCloud(currentUser.id, updated, likedTracks);
    }
    showToast(`Created playlist "${name}"`);
    navigateTo('playlist', newPlaylist.id);
  };

  // Image to Playlist: Imports songs from Spotify screenshot with strict deduplication
  const handleImportTracksFromImage = (
    destination: { type: 'new'; name: string } | { type: 'existing'; playlistId: string },
    tracksToAdd: MusicTrack[]
  ) => {
    if (!tracksToAdd || tracksToAdd.length === 0) return;

    if (destination.type === 'new') {
      const newPlaylist: Playlist = {
        id: `playlist-${Date.now()}`,
        name: destination.name.trim() || 'Spotify Import',
        description: `Imported with ${tracksToAdd.length} songs.`,
        coverUrl: tracksToAdd[0]?.thumbnailUrl,
        createdAt: new Date().toISOString(),
        isCustom: true,
        tracks: tracksToAdd,
      };

      const updated = [newPlaylist, ...playlists];
      setPlaylists(updated);
      savePlaylists(updated, currentUser?.id);
      if (currentUser?.id) {
        syncUserDataToCloud(currentUser.id, updated, likedTracks);
      }
      showToast(`Created playlist "${newPlaylist.name}" with ${tracksToAdd.length} songs!`, 'success');
      navigateTo('playlist', newPlaylist.id);
    } else {
      // 1. Check if target is Liked Songs
      if (destination.playlistId === 'playlist-liked-songs') {
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const uniqueNewTracks = tracksToAdd.filter((track) => {
          const idMatch = likedTracks.some((t) => t.id === track.id);
          const nameMatch = likedTracks.some(
            (t) => norm(t.title) === norm(track.title) && norm(t.artist) === norm(track.artist)
          );
          return !idMatch && !nameMatch;
        });

        const duplicateCount = tracksToAdd.length - uniqueNewTracks.length;

        if (uniqueNewTracks.length === 0) {
          showToast(
            `All ${tracksToAdd.length} songs already exist in Liked Songs. No duplicates added.`,
            'info'
          );
          navigateTo('liked');
          return;
        }

        const updatedLikes = [...uniqueNewTracks, ...likedTracks];
        setLikedTracks(updatedLikes);
        saveLikedTracks(updatedLikes, currentUser?.id);
        if (currentUser?.id) {
          syncUserDataToCloud(currentUser.id, playlists, updatedLikes);
        }

        showToast(
          duplicateCount > 0
            ? `Added ${uniqueNewTracks.length} song${uniqueNewTracks.length === 1 ? '' : 's'} to Liked Songs (${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'} skipped to prevent repeats).`
            : `Added ${uniqueNewTracks.length} song${uniqueNewTracks.length === 1 ? '' : 's'} to Liked Songs!`,
          'success'
        );
        navigateTo('liked');
        return;
      }

      // 2. Target custom or library playlist
      const target = playlists.find((p) => p.id === destination.playlistId);
      if (!target) return;

      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Strict duplicate check to prevent song loops and repeats
      const uniqueNewTracks = tracksToAdd.filter((track) => {
        const idMatch = target.tracks.some((t) => t.id === track.id);
        const nameMatch = target.tracks.some(
          (t) => norm(t.title) === norm(track.title) && norm(t.artist) === norm(track.artist)
        );
        return !idMatch && !nameMatch;
      });

      const duplicateCount = tracksToAdd.length - uniqueNewTracks.length;

      if (uniqueNewTracks.length === 0) {
        showToast(
          `All ${tracksToAdd.length} songs already exist in "${target.name}". No duplicates added.`,
          'info'
        );
        navigateTo('playlist', target.id);
        return;
      }

      const updatedPlaylist: Playlist = {
        ...target,
        tracks: [...target.tracks, ...uniqueNewTracks],
        coverUrl: target.coverUrl || uniqueNewTracks[0]?.thumbnailUrl,
      };

      const updated = playlists.map((p) => (p.id === target.id ? updatedPlaylist : p));
      setPlaylists(updated);
      savePlaylists(updated, currentUser?.id);
      if (currentUser?.id) {
        syncUserDataToCloud(currentUser.id, updated, likedTracks);
      }

      showToast(
        duplicateCount > 0
          ? `Added ${uniqueNewTracks.length} song${uniqueNewTracks.length === 1 ? '' : 's'} to "${target.name}" (${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'} skipped to prevent repeat loops).`
          : `Added ${uniqueNewTracks.length} song${uniqueNewTracks.length === 1 ? '' : 's'} to "${target.name}"!`,
        'success'
      );
      navigateTo('playlist', target.id);
    }
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const updated = playlists.filter((p) => p.id !== playlistId);
    setPlaylists(updated);
    savePlaylists(updated);
    if (currentUser?.id) {
      syncUserDataToCloud(currentUser.id, updated, likedTracks);
    }
    setPinnedPlaylistIds((prev) => {
      if (!prev.has(playlistId)) return prev;
      const next = new Set(prev);
      next.delete(playlistId);
      savePinnedPlaylists(next, currentUser?.id);
      return next;
    });
    showToast('Playlist deleted', 'info');
    if (selectedPlaylistId === playlistId) {
      navigateTo('home');
    }
  };

  const handleRenamePlaylist = (playlistId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updated = playlists.map((p) =>
      p.id === playlistId ? { ...p, name: trimmed } : p
    );
    setPlaylists(updated);
    savePlaylists(updated, currentUser?.id);
    if (currentUser?.id) {
      syncUserDataToCloud(currentUser.id, updated, likedTracks);
    }
    showToast(`Renamed playlist to "${trimmed}"`, 'success');
  };

  const handleTogglePinPlaylist = (playlistId: string) => {
    setPinnedPlaylistIds((prev) => {
      const next = new Set(prev);
      const isPinned = next.has(playlistId);
      if (isPinned) {
        next.delete(playlistId);
        showToast('Unpinned from top of Library', 'info');
      } else {
        next.add(playlistId);
        showToast('Pinned to top of Library');
      }
      savePinnedPlaylists(next, currentUser?.id);
      return next;
    });
  };

  const handleAddToPlaylist = (playlistId: string, track: MusicTrack) => {
    if (!currentUser) {
      setAuthReason('Sign in with Google or Phone to add tracks to playlists');
      pendingActionRef.current = () => handleAddToPlaylist(playlistId, track);
      setIsAuthModalOpen(true);
      return;
    }
    const target = playlists.find((p) => p.id === playlistId);
    if (!target) return;

    if (target.tracks.some((t) => t.id === track.id)) {
      showToast(`Track already exists in "${target.name}"`, 'info');
      return;
    }

    const updatedTracks = [...target.tracks, track];
    const updatedPlaylist: Playlist = {
      ...target,
      tracks: updatedTracks,
      coverUrl: target.coverUrl || track.thumbnailUrl,
    };

    const updated = playlists.map((p) => (p.id === playlistId ? updatedPlaylist : p));
    setPlaylists(updated);
    savePlaylists(updated);
    if (currentUser?.id) {
      syncUserDataToCloud(currentUser.id, updated, likedTracks);
    }
    showToast(`Added to "${target.name}"`);
  };

  const handleRemoveTrackFromPlaylist = (playlistId: string, trackId: string) => {
    const target = playlists.find((p) => p.id === playlistId);
    if (!target) return;

    const updatedTracks = target.tracks.filter((t) => t.id !== trackId);
    const updatedPlaylist: Playlist = {
      ...target,
      tracks: updatedTracks,
    };

    const updated = playlists.map((p) => (p.id === playlistId ? updatedPlaylist : p));
    setPlaylists(updated);
    savePlaylists(updated);
    if (currentUser?.id) {
      syncUserDataToCloud(currentUser.id, updated, likedTracks);
    }
    showToast('Track removed from playlist');
  };

  const handlePlayNext = (track: MusicTrack) => {
    setQueue((prev) => [track, ...prev]);
    showToast(`"${track.title}" will play next`);
  };

  const handleAddToQueue = (track: MusicTrack) => {
    setQueue((prev) => [...prev, track]);
    showToast(`Added "${track.title}" to queue`);
  };

  // Keyboard Shortcuts for Windows Desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

      if (e.code === 'Space' && !isInput) {
        e.preventDefault();
        handleTogglePlay();
      }

      if (e.ctrlKey && e.code === 'ArrowRight' && !isInput) {
        e.preventDefault();
        handleNextTrack();
      }

      if (e.ctrlKey && e.code === 'ArrowLeft' && !isInput) {
        e.preventDefault();
        handlePrevTrack();
      }

      if (e.code === 'KeyM' && !isInput) {
        e.preventDefault();
        handleToggleMute();
      }

      if (e.code === 'KeyL' && !isInput && currentTrack) {
        e.preventDefault();
        handleToggleLike(currentTrack);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTrack, currentTime, recentTracks, queue, isMuted, isShuffle, repeatMode]);

  // User imported & user created playlists on top, with pinned playlists hoisted to the very top
  const allPlaylists = useMemo(() => {
    const combined = [...playlists, ...autoMixes];
    return combined.sort((a, b) => {
      const aPinned = pinnedPlaylistIds.has(a.id);
      const bPinned = pinnedPlaylistIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // User created & imported playlists on top of system auto-mixes
      if (a.isCustom && !b.isCustom) return -1;
      if (!a.isCustom && b.isCustom) return 1;

      return 0;
    });
  }, [playlists, autoMixes, pinnedPlaylistIds]);
  const currentPlaylist = allPlaylists.find((p) => p.id === selectedPlaylistId) || null;

  return (
    <div
      className={`spotify-desktop-app-frame ${currentTrack ? 'has-player' : 'no-player'}`}
      data-theme={theme}
      data-current-view={currentView}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="spotify-main-layout">
        {/* Left Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={navigateTo}
          playlists={allPlaylists}
          selectedPlaylistId={selectedPlaylistId}
          likedCount={likedTracks.length}
          likedTracks={likedTracks}
          onPlayTrack={handlePlayTrack}
          onOpenCreateModal={handleOpenCreateModal}
          onDeletePlaylist={handleDeletePlaylist}
          currentUser={currentUser}
          onOpenAuthModal={() => {
            setAuthReason(undefined);
            setIsAuthModalOpen(true);
          }}
          onQuickExplore={(category) => {
            navigateTo('search');
            if (category === 'new_releases') {
              setSelectedFilter('new_releases');
              setQuery('New Releases');
              performSearch('New Releases', 'new_releases');
            } else {
              setSelectedFilter('songs');
              setQuery(category);
              performSearch(category, 'songs');
            }
          }}
        />

        {/* Center Main Stage */}
        <div className="spotify-content-stage">
          {/* Top Navigation */}
          <TopNav
            currentView={currentView}
            theme={theme}
            onThemeChange={setTheme}
            onOpenSettings={() => navigateTo('settings')}
            onGoBack={handleGoBack}
            onGoForward={handleGoForward}
            canGoBack={historyIndex > 0}
            canGoForward={historyIndex < viewHistory.length - 1}
            currentUser={currentUser}
            onOpenAuthModal={() => {
              setAuthReason(undefined);
              setIsAuthModalOpen(true);
            }}
          />

          <main className="spotify-scrollable-canvas">
            {/* HOME VIEW */}
            {currentView === 'home' && (
              <HomeView
                playlists={playlists}
                autoMixes={autoMixes}
                likedTracks={likedTracks}
                recentTracks={recentTracks}
                newReleases={newReleases}
                theme={theme}
                language={musicLanguage}
                onLanguageChange={(newLang) => {
                  setMusicLanguage(newLang);
                  saveMusicLanguage(newLang);
                }}
                onOpenSettings={() => navigateTo('settings')}
                languageTracks={languageTracks}
                isLanguageLoading={isLanguageLoading}
                madeForYouTracks={madeForYouTracks}
                searchRecTracks={searchRecTracks}
                searchRecQuery={searchRecQuery}
                themeTracks={themeTracks}
                onPlayTrack={handlePlayTrack}
                onPlayPlaylist={handlePlayPlaylist}
                onOpenPlaylist={(plId) => navigateTo('playlist', plId)}
                onOpenLiked={() => navigateTo('liked')}
                onExploreQuery={(exploreQuery, filter) => {
                  navigateTo('search');
                  const f = (filter as SearchFilterType) || 'all';
                  setSelectedFilter(f);
                  setQuery(exploreQuery);
                  performSearch(exploreQuery, f);
                }}
              />
            )}

            {/* SEARCH VIEW */}
            {currentView === 'search' && (
              <div className="spotify-search-view">
                <SearchBar
                  onSearch={(q, f) => {
                    const filter = f || selectedFilter;
                    performSearch(q, filter, 1, false);
                  }}
                  isLoading={isLoading}
                  selectedFilter={selectedFilter}
                  onFilterChange={(f) => {
                    setSelectedFilter(f);
                  }}
                  initialQuery={query}
                  liveResults={searchResults}
                  onSelectTrack={(t, q) => handlePlayTrack(t, q || searchResults)}
                  algorithmicTracks={madeForYouTracks.length > 0 ? madeForYouTracks : searchRecTracks}
                  recentTracks={recentTracks}
                  trendingTracks={newReleases.length > 0 ? newReleases : languageTracks}
                  searchHistory={loadSearchHistory()}
                />

                <TrackList
                  tracks={searchResults}
                  isLoading={isLoading}
                  isLoadingMore={isLoadingMore}
                  error={searchError}
                  onRetry={() => performSearch(query, selectedFilter, 1, false)}
                  onSelectTrack={(t, q) => handlePlayTrack(t, q || searchResults)}
                  activeTrackId={currentTrack?.id}
                  hasMore={hasMore}
                  onLoadMore={() => {
                    if (isLoadingMore || !hasMore) return;
                    performSearch(query, selectedFilter, page + 1, true);
                  }}
                  onSelectSuggestion={(sQuery) => {
                    setQuery(sQuery);
                    performSearch(sQuery, selectedFilter, 1, false);
                  }}
                  query={query}
                  likedTrackIds={likedTrackIds}
                  onToggleLike={handleToggleLike}
                  onOpenAddToPlaylist={handleOpenAddToPlaylist}
                  recentTracks={recentTracks}
                  likedTracks={likedTracks}
                  algorithmicTracks={madeForYouTracks.length > 0 ? madeForYouTracks : languageTracks}
                  searchHistory={loadSearchHistory()}
                  onClearHistory={() => {
                    clearSearchHistory(currentUser?.id);
                    showToast('Search history cleared', 'info');
                  }}
                />
              </div>
            )}

            {/* PLAYLIST VIEW */}
            {currentView === 'playlist' && currentPlaylist && (
              <PlaylistView
                playlist={currentPlaylist}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                likedTrackIds={likedTrackIds}
                onPlayPlaylist={handlePlayPlaylist}
                onPlayTrack={(t, q) => handlePlayTrack(t, q)}
                onToggleLike={handleToggleLike}
                onRemoveTrack={handleRemoveTrackFromPlaylist}
                onDeletePlaylist={handleDeletePlaylist}
                onOpenAddToPlaylist={handleOpenAddToPlaylist}
                onPlayNext={handlePlayNext}
                onAddToQueue={handleAddToQueue}
                isPinned={pinnedPlaylistIds.has(currentPlaylist.id)}
                onTogglePin={handleTogglePinPlaylist}
                onRenamePlaylist={handleRenamePlaylist}
              />
            )}

            {/* LIKED SONGS VIEW */}
            {currentView === 'liked' && (
              <PlaylistView
                playlist={{
                  id: 'playlist-liked-songs',
                  name: 'Liked Songs',
                  description: 'Your favorite tracks saved with love.',
                  coverUrl:
                    'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=60',
                  createdAt: new Date().toISOString(),
                  isCustom: false,
                  tracks: likedTracks,
                }}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                likedTrackIds={likedTrackIds}
                onPlayPlaylist={(_, idx) => {
                  if (likedTracks.length > 0) {
                    handlePlayTrack(likedTracks[idx || 0], likedTracks);
                  }
                }}
                onPlayTrack={(t) => handlePlayTrack(t, likedTracks)}
                onToggleLike={handleToggleLike}
                onRemoveTrack={(_, trackId) => {
                  const target = likedTracks.find((t) => t.id === trackId);
                  if (target) handleToggleLike(target);
                }}
                onDeletePlaylist={() => {}}
                onOpenAddToPlaylist={handleOpenAddToPlaylist}
                onPlayNext={handlePlayNext}
                onAddToQueue={handleAddToQueue}
              />
            )}

            {/* LIBRARY VIEW (MOBILE & DESKTOP) */}
            {currentView === 'library' && (
              <LibraryView
                playlists={allPlaylists}
                likedTracks={likedTracks}
                onOpenPlaylist={(plId) => navigateTo('playlist', plId)}
                onOpenLiked={() => navigateTo('liked')}
                onPlayPlaylist={handlePlayPlaylist}
                onPlayTrack={(t, q) => handlePlayTrack(t, q)}
                onOpenCreateModal={handleOpenCreateModal}
                onOpenSpotifyImport={() => handleOpenSpotifyImport(null)}
                onDeletePlaylist={handleDeletePlaylist}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                pinnedPlaylistIds={pinnedPlaylistIds}
                onTogglePinPlaylist={handleTogglePinPlaylist}
              />
            )}

            {/* SETTINGS VIEW (CATEGORIZED FULL PAGE VIEW) */}
            {currentView === 'settings' && (
              <SettingsView
                theme={theme}
                onThemeChange={(newTheme) => {
                  setTheme(newTheme);
                  showToast(`Theme updated to ${newTheme.toUpperCase()}`);
                }}
                audioQuality={audioQuality}
                onQualityChange={handleQualityChange}
                musicLanguage={musicLanguage}
                onLanguageChange={(newLang) => {
                  setMusicLanguage(newLang);
                  saveMusicLanguage(newLang);
                  showToast(`Music region set to ${newLang.toUpperCase()}`);
                }}
                audioNormalization={audioNormalization}
                onNormalizationChange={handleNormalizationChange}
                onGoBack={handleGoBack}
                currentUser={currentUser}
                onOpenAuthModal={() => {
                  setAuthReason(undefined);
                  setIsAuthModalOpen(true);
                }}
                onLogout={handleLogout}
                likedTracksCount={likedTracks.length}
                playlistsCount={playlists.length}
              />
            )}
          </main>
        </div>
      </div>

      {/* Background Audio Engine & Now Playing Video Theater Overlay */}
      <PlayerTestPanel
        ref={playerRef}
        selectedTrack={currentTrack}
        initialStartTime={initialStartTime}
        onPlayerStateChange={(state) => {
          setPlayerState(state);
          if (state === 'PLAYING') {
            setIsPlaying(true);
          } else if (state === 'PAUSED' || state === 'ENDED' || state === 'UNSTARTED') {
            setIsPlaying(false);
          }
        }}
        onPlayerErrorChange={(err) => {
          setPlayerError(err);
          if (err) {
            setIsPlaying(false);
            showToast(`${err.title}: ${err.description}`, 'error');
          }
        }}
        onTimeUpdate={(cur, tot) => {
          setCurrentTime(cur);
          if (tot > 0) setDuration(tot);

          // Continuously save current playback position to localStorage session
          const now = Date.now();
          if (currentTrack && (now - lastSavedSessionTimeRef.current > 1500)) {
            lastSavedSessionTimeRef.current = now;
            savePlaybackSession({
              track: currentTrack,
              currentTime: cur,
              duration: tot > 0 ? tot : duration,
              queue,
              savedAt: now,
              isPlaying: isPlaying,
            });
          }
        }}
        onTrackEnded={() => {
          handleTrackEnded();
          if (queue.length === 0 && repeatMode !== 'all') {
            clearPlaybackSession();
          }
        }}
        playerState={playerState}
        playerError={playerError}
        isExpanded={isExpandedView}
        onCloseExpanded={() => setIsExpandedView(false)}
        quality={audioQuality}
        onQualityChange={handleQualityChange}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        isLiked={currentTrack ? likedTrackIds.has(currentTrack.id) : false}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        volume={volume}
        isMuted={isMuted}
        onTogglePlay={handleTogglePlay}
        onPrevTrack={handlePrevTrack}
        onNextTrack={() => handleNextTrack(true)}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleShuffle={() => {
          setIsShuffle(!isShuffle);
          showToast(!isShuffle ? 'Shuffle turned on' : 'Shuffle turned off');
        }}
        onCycleRepeat={handleCycleRepeat}
        onToggleLike={handleToggleLike}
        onPlayTrack={(t) => handlePlayTrack(t)}
        onTrackResolved={handleTrackResolved}
        audioNormalization={audioNormalization}
      />

      {/* Slide-over Queue Drawer */}
      <QueueDrawer
        isOpen={showQueue}
        onClose={() => setShowQueue(false)}
        currentTrack={currentTrack}
        queue={queue}
        onPlayTrack={(t) => handlePlayTrack(t)}
        onClearQueue={() => {
          setQueue([]);
          showToast('Queue cleared');
        }}
        onRemoveFromQueue={(idx) => {
          setQueue((prev) => prev.filter((_, i) => i !== idx));
          showToast('Track removed from queue');
        }}
      />

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        isOpen={addToPlaylistTrack !== null}
        onClose={() => setAddToPlaylistTrack(null)}
        track={addToPlaylistTrack}
        playlists={playlists}
        onAddToPlaylist={handleAddToPlaylist}
        onCreateAndAdd={(name, track) => handleCreatePlaylist(name, track)}
      />

      {/* Dedicated High-End Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={(name, desc, cover) => {
          if (!currentUser) {
            setAuthReason('Sign in with Google or Phone to create personal playlists');
            setIsAuthModalOpen(true);
            return;
          }
          const newPlaylist: Playlist = {
            id: `playlist-${Date.now()}`,
            name,
            description: desc || 'Custom user created playlist',
            coverUrl: cover,
            createdAt: new Date().toISOString(),
            isCustom: true,
            tracks: [],
          };
          const updated = [newPlaylist, ...playlists];
          setPlaylists(updated);
          savePlaylists(updated);
          showToast(`Created playlist "${name}"`);
          navigateTo('playlist', newPlaylist.id);
        }}
      />

      {/* Spotify Import Modal (Direct Spotify link import, no glow, simple paste) */}
      <SpotifyImportModal
        isOpen={isSpotifyImportModalOpen}
        onClose={() => {
          setIsSpotifyImportModalOpen(false);
          setSpotifyImportTargetPlaylistId(null);
        }}
        playlists={[
          {
            id: 'playlist-liked-songs',
            name: 'Liked Songs',
            description: 'Your liked songs collection',
            createdAt: '',
            isCustom: false,
            tracks: likedTracks,
          },
          ...playlists,
        ]}
        initialPlaylistId={spotifyImportTargetPlaylistId}
        onImportTracks={handleImportTracksFromImage}
      />

      {/* Authentication Modal (Google & Phone OTP with Real Cloud Sync) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          pendingActionRef.current = null;
        }}
        onLoginSuccess={handleLoginSuccess}
        reason={authReason}
        currentPlaylists={playlists}
        currentLikedTracks={likedTracks}
      />

      {/* Ambient Toast Notification */}
      <Toast
        toast={toast}
        onDismiss={() => setToast(null)}
        hasCurrentTrack={Boolean(currentTrack)}
      />

      {/* Continuous Playback Prompt from Another Device */}
      {remoteSessionNotice && remoteSessionNotice.track && (
        <div className="continuous-sync-banner">
          <div className="continuous-sync-info">
            <span className="continuous-sync-badge">
              <Flame size={13} className="text-amber" />
              Listening on {remoteSessionNotice.deviceName || 'another device'}
            </span>
            <span className="continuous-sync-title">
              {remoteSessionNotice.track.title} • {remoteSessionNotice.track.artist}
            </span>
          </div>
          <div className="continuous-sync-actions">
            <button
              type="button"
              className="continuous-sync-resume-btn"
              onClick={() => {
                if (remoteSessionNotice.track) {
                  handlePlayTrack(remoteSessionNotice.track, remoteSessionNotice.queue || []);
                  if ((remoteSessionNotice.currentTime || 0) > 0) {
                    setTimeout(() => {
                      handleSeek(remoteSessionNotice.currentTime);
                    }, 350);
                  }
                  showToast(`Resumed "${remoteSessionNotice.track.title}" from other device!`, 'success');
                }
                setRemoteSessionNotice(null);
              }}
            >
              Continue Playing
            </button>
            <button
              type="button"
              className="continuous-sync-close-btn"
              onClick={() => setRemoteSessionNotice(null)}
              aria-label="Dismiss banner"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Persistent Bottom Playback Transport Bar — Only rendered when a track is loaded/playing */}
      {currentTrack && (
        <BottomPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          playerState={playerState}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          isLiked={likedTrackIds.has(currentTrack.id)}
          showQueue={showQueue}
          quality={audioQuality}
          onQualityChange={handleQualityChange}
          onOpenExpanded={() => {
            setIsExpandedView(true);
          }}
          onTogglePlay={handleTogglePlay}
          onPrevTrack={handlePrevTrack}
          onNextTrack={() => handleNextTrack(true)}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onToggleShuffle={() => {
            setIsShuffle(!isShuffle);
            showToast(!isShuffle ? 'Shuffle turned on' : 'Shuffle turned off');
          }}
          onCycleRepeat={handleCycleRepeat}
          onToggleLike={(t) => handleToggleLike(t)}
          onOpenAddToPlaylist={handleOpenAddToPlaylist}
          onToggleQueue={() => setShowQueue(!showQueue)}
        />
      )}

      {/* Fixed Mobile Bottom Navigation Bar (No Premium Button, 4 Essential Tabs) */}
      <MobileBottomNav
        currentView={currentView}
        onNavigate={navigateTo}
        onOpenCreateModal={handleOpenCreateModal}
      />

      {/* Spotify-style Mini Pop-up Window on Minimize / Tab Change (Image 3 UI) */}
      <MiniPlayerPopup
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isLiked={currentTrack ? likedTrackIds.has(currentTrack.id) : false}
        onToggleLike={(t) => handleToggleLike(t)}
        onTogglePlay={handleTogglePlay}
        onNextTrack={() => handleNextTrack(true)}
        onPrevTrack={handlePrevTrack}
        onSeek={handleSeek}
        onToggleMute={handleToggleMute}
        onOpenExpanded={() => setIsExpandedView(true)}
      />
    </div>
  );
}

export default App;
