import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { HomeView } from './components/HomeView';
import { PlaylistView } from './components/PlaylistView';
import { LibraryView } from './components/LibraryView';
import { BottomPlayer } from './components/BottomPlayer';
import { QueueDrawer } from './components/QueueDrawer';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { Toast, type ToastMessage } from './components/Toast';
import { SearchBar } from './components/SearchBar';
import { TrackList } from './components/TrackList';
import { PlayerTestPanel, type PlayerHandle } from './components/PlayerTestPanel';
import { MiniPlayerPopup } from './components/MiniPlayerPopup';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SettingsView } from './components/SettingsView';
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
} from './services/storage';

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

  // Collections State
  const [playlists, setPlaylists] = useState<Playlist[]>(() => loadPlaylists());
  const [likedTracks, setLikedTracks] = useState<MusicTrack[]>(() => loadLikedTracks());
  const [recentTracks, setRecentTracks] = useState<MusicTrack[]>([]);
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

  // Playback & Queue State
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playerState, setPlayerState] = useState<YTPlayerStateName>('UNINITIALIZED');
  const [playerError, setPlayerError] = useState<PlayerErrorInfo | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
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
  const [isExpandedView, setIsExpandedView] = useState<boolean>(false);

  const playerRef = useRef<PlayerHandle | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
        const nr = await searchTracks('New Releases', 1, 10, 'ytmusicapi', 'new_releases');
        if (isMounted && nr.items.length > 0) {
          setNewReleases(nr.items);
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

  // 0. Smart "Made For You" Recommendation Algorithm (Likings + Plays + Searches)
  useEffect(() => {
    let isMounted = true;
    const taste = getUserTasteProfile(likedTracks, recentTracks);

    let queryTarget = 'Trending Hits';
    if (taste.length >= 2) {
      queryTarget = `${taste[0]} ${taste[1]} hits`;
    } else if (taste.length === 1) {
      queryTarget = `${taste[0]} songs`;
    } else if (musicLanguage && musicLanguage !== 'all') {
      queryTarget = `${musicLanguage} top songs`;
    }

    searchTracks(queryTarget, 1, 10, 'ytmusicapi', 'songs')
      .then((res) => {
        if (isMounted && res.items.length > 0) {
          setMadeForYouTracks(res.items);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch Made For You tracks:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [likedTracks, recentTracks, musicLanguage]);

  // 1. Language & Regional Recommendation Engine
  useEffect(() => {
    let isMounted = true;
    setIsLanguageLoading(true);

    const languageQueryMap: Record<string, string> = {
      malayalam: 'Malayalam Hits Top Songs',
      hindi: 'Trending Hindi Hits',
      tamil: 'Latest Tamil Top Songs',
      punjabi: 'Punjabi Hot Hits',
      english: 'Top Global Pop Hits',
      synthwave: 'Synthwave Midnight Beats',
      lofi: 'Lo-Fi Chill Beats',
      all: 'Trending Global Music Charts',
    };

    const targetQuery = languageQueryMap[musicLanguage] || 'Trending Global Music Charts';

    searchTracks(targetQuery, 1, 10, 'ytmusicapi', 'songs')
      .then((res) => {
        if (isMounted && res.items.length > 0) {
          setLanguageTracks(res.items);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch language tracks:', err);
      })
      .finally(() => {
        if (isMounted) setIsLanguageLoading(false);
      });

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

    searchTracks(candidateQuery, 1, 8, 'ytmusicapi', 'songs')
      .then((res) => {
        if (isMounted && res.items.length > 0) {
          setSearchRecTracks(res.items);
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
      cyber: 'Cyberpunk Synthwave Electro',
      amber: 'Warm Acoustic Soulful Indie',
      aurora: 'Dream Pop Ambient Indie',
    };

    const tQuery = themeQueryMap[theme] || 'Indie Chill';
    searchTracks(tQuery, 1, 8, 'ytmusicapi', 'songs')
      .then((res) => {
        if (isMounted && res.items.length > 0) {
          setThemeTracks(res.items);
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
    setCurrentTrack(track);
    setIsPlaying(true);
    setPlayerError(null);

    // Track history & artist preference
    setRecentTracks((prev) => [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 20));
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

  // Liked Songs Management
  const handleToggleLike = (track: MusicTrack) => {
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
      if (changed) savePlaylists(updated);
      return updated;
    });
  };

  // Custom Playlists Management
  const handleCreatePlaylist = (name: string, initialTrack?: MusicTrack) => {
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
    showToast(`Created playlist "${name}"`);
    navigateTo('playlist', newPlaylist.id);
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const updated = playlists.filter((p) => p.id !== playlistId);
    setPlaylists(updated);
    savePlaylists(updated);
    showToast('Playlist deleted', 'info');
    if (selectedPlaylistId === playlistId) {
      navigateTo('home');
    }
  };

  const handleAddToPlaylist = (playlistId: string, track: MusicTrack) => {
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

  // Find currently open playlist
  const currentPlaylist = playlists.find((p) => p.id === selectedPlaylistId) || null;

  return (
    <div
      className="spotify-desktop-app-frame"
      data-theme={theme}
      data-current-view={currentView}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="spotify-main-layout">
        {/* Left Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={navigateTo}
          playlists={playlists}
          selectedPlaylistId={selectedPlaylistId}
          likedCount={likedTracks.length}
          likedTracks={likedTracks}
          onPlayTrack={handlePlayTrack}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onDeletePlaylist={handleDeletePlaylist}
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
          />

          <main className="spotify-scrollable-canvas">
            {/* HOME VIEW */}
            {currentView === 'home' && (
              <HomeView
                playlists={playlists}
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
                  onSelectTrack={(t) => handlePlayTrack(t, searchResults)}
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
                  onOpenAddToPlaylist={(t) => setAddToPlaylistTrack(t)}
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
                onOpenAddToPlaylist={(t) => setAddToPlaylistTrack(t)}
                onPlayNext={handlePlayNext}
                onAddToQueue={handleAddToQueue}
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
                onOpenAddToPlaylist={(t) => setAddToPlaylistTrack(t)}
                onPlayNext={handlePlayNext}
                onAddToQueue={handleAddToQueue}
              />
            )}

            {/* LIBRARY VIEW (MOBILE & DESKTOP) */}
            {currentView === 'library' && (
              <LibraryView
                playlists={playlists}
                likedTracks={likedTracks}
                onOpenPlaylist={(plId) => navigateTo('playlist', plId)}
                onOpenLiked={() => navigateTo('liked')}
                onPlayPlaylist={handlePlayPlaylist}
                onPlayTrack={(t, q) => handlePlayTrack(t, q)}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onDeletePlaylist={handleDeletePlaylist}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
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
              />
            )}
          </main>
        </div>
      </div>

      {/* Background Audio Engine & Now Playing Video Theater Overlay */}
      <PlayerTestPanel
        ref={playerRef}
        selectedTrack={currentTrack}
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
        }}
        onTrackEnded={handleTrackEnded}
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


      {/* Windows Toast Notification */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Persistent Bottom Playback Transport Bar */}
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
        isLiked={currentTrack ? likedTrackIds.has(currentTrack.id) : false}
        showQueue={showQueue}
        quality={audioQuality}
        onQualityChange={handleQualityChange}
        onOpenExpanded={() => {
          if (currentTrack) {
            setIsExpandedView(true);
          } else {
            showToast('Select a song first to open theater mode', 'info');
          }
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
        onOpenAddToPlaylist={(t) => setAddToPlaylistTrack(t)}
        onToggleQueue={() => setShowQueue(!showQueue)}
      />

      {/* Fixed Mobile Bottom Navigation Bar (No Premium Button, 4 Essential Tabs) */}
      <MobileBottomNav
        currentView={currentView}
        onNavigate={navigateTo}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      {/* Spotify-style Mini Pop-up Window on Minimize / Tab Change */}
      <MiniPlayerPopup
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        onTogglePlay={handleTogglePlay}
        onNextTrack={() => handleNextTrack(true)}
        onPrevTrack={handlePrevTrack}
        onSeek={handleSeek}
        onToggleMute={handleToggleMute}
      />
    </div>
  );
}

export default App;
