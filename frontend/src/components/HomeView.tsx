import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Heart,
  Flame,
  Disc3,
  Music,
  Clock,
  ChevronRight,
  Compass,
  Radio,
  Video,
  Loader2,
} from 'lucide-react';
import type { Playlist, MusicTrack, ThemePalette } from '../types';
import { searchTracks } from '../services/api';

interface HomeViewProps {
  playlists: Playlist[];
  likedTracks: MusicTrack[];
  recentTracks: MusicTrack[];
  newReleases: MusicTrack[];
  theme: ThemePalette;
  language: string;
  onLanguageChange: (lang: string) => void;
  languageTracks: MusicTrack[];
  isLanguageLoading: boolean;
  madeForYouTracks?: MusicTrack[];
  searchRecTracks: MusicTrack[];
  searchRecQuery: string | null;
  themeTracks: MusicTrack[];
  onPlayTrack: (track: MusicTrack, queue?: MusicTrack[]) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onOpenLiked: () => void;
  onExploreQuery: (query: string, filter?: string) => void;
  onOpenSettings?: () => void;
}

const FALLBACK_ARTWORK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23161619'/%3E%3Cpath d='M150 110v80m0-40a20 20 0 1 1-40 0 20 20 0 0 1 40 0zm0 0v-20l40-10v30' fill='none' stroke='%23f59e0b' stroke-width='8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

const LANGUAGE_FILTERS = [
  { id: 'all', name: 'All Music', icon: '🌐' },
  { id: 'malayalam', name: 'Malayalam', icon: '🌴' },
  { id: 'hindi', name: 'Hindi', icon: '🇮🇳' },
  { id: 'tamil', name: 'Tamil', icon: '🔥' },
  { id: 'punjabi', name: 'Punjabi', icon: '⚡' },
  { id: 'english', name: 'Global Pop', icon: '🎧' },
  { id: 'synthwave', name: 'Synthwave', icon: '🏎️' },
  { id: 'lofi', name: 'Lo-Fi Chill', icon: '☕' },
];

export const HomeView: React.FC<HomeViewProps> = ({
  playlists,
  likedTracks,
  recentTracks,
  newReleases,
  theme,
  language,
  onLanguageChange,
  languageTracks,
  isLanguageLoading,
  madeForYouTracks = [],
  searchRecTracks,
  searchRecQuery,
  themeTracks,
  onPlayTrack,
  onPlayPlaylist,
  onOpenPlaylist,
  onOpenLiked,
  onExploreQuery,
  onOpenSettings,
}) => {
  // Compact dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getThemeTitle = () => {
    if (theme === 'cyber') return 'Cyber & Synthwave Pulse';
    if (theme === 'amber') return 'Golden Hour & Soulful Warmth';
    return 'Aurora Chill & Indie Soundscape';
  };

  const selectedLangObj = LANGUAGE_FILTERS.find((l) => l.id === language) || LANGUAGE_FILTERS[0];

  // Dynamic Scroll-to-Discover More Related Music Videos at Bottom of Home
  const [moreVideos, setMoreVideos] = useState<MusicTrack[]>([]);
  const [morePage, setMorePage] = useState<number>(1);
  const [isLoadingMoreVideos, setIsLoadingMoreVideos] = useState<boolean>(false);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  const fetchMoreHomeVideos = useCallback(async () => {
    if (isLoadingMoreVideos) return;
    setIsLoadingMoreVideos(true);
    try {
      const q =
        language && language !== 'all'
          ? `${language} songs official video`
          : 'trending music videos hits';
      const res = await searchTracks(q, morePage, 10, 'ytmusicapi', 'videos');
      if (res.items.length > 0) {
        setMoreVideos((prev) => {
          const map = new Map<string, MusicTrack>();
          prev.forEach((t) => map.set(t.id, t));
          res.items.forEach((t) => map.set(t.id, t));
          return Array.from(map.values());
        });
        setMorePage((p) => p + 1);
      }
    } catch (err) {
      console.warn('Could not fetch more related videos for Home:', err);
    } finally {
      setIsLoadingMoreVideos(false);
    }
  }, [language, morePage, isLoadingMoreVideos]);

  // Initial fetch for bottom videos or on language change
  useEffect(() => {
    let active = true;
    const initialQuery =
      language && language !== 'all'
        ? `${language} songs official video`
        : 'trending music videos hits';
    searchTracks(initialQuery, 1, 10, 'ytmusicapi', 'videos')
      .then((res) => {
        if (active && res.items.length > 0) {
          setMoreVideos(res.items);
          setMorePage(2);
        }
      })
      .catch((e) => console.warn('Home bottom videos fetch:', e));
    return () => {
      active = false;
    };
  }, [language]);

  // Intersection observer for seamless infinite scroll
  useEffect(() => {
    const el = bottomSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMoreVideos) {
          fetchMoreHomeVideos();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchMoreHomeVideos, isLoadingMoreVideos]);

  // Reusable unified music card renderer
  const renderCard = (track: MusicTrack, queue: MusicTrack[], keyPrefix: string) => {
    const title = track.title || 'Untitled Track';
    const artist = track.artist || 'Unknown Artist';
    const thumb = track.thumbnailUrl || FALLBACK_ARTWORK;

    return (
      <div
        key={`${keyPrefix}-${track.id}`}
        className="music-media-card"
        onClick={() => onPlayTrack(track, queue)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPlayTrack(track, queue);
          }
        }}
      >
        <div className="media-card-artwork">
          <img
            src={thumb}
            alt={title}
            className="media-card-img"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK_ARTWORK;
            }}
          />
          <button
            type="button"
            className="media-card-hover-play"
            onClick={(e) => {
              e.stopPropagation();
              onPlayTrack(track, queue);
            }}
            title={`Play ${title}`}
            aria-label={`Play ${title}`}
          >
            <Play size={18} fill="currentColor" />
          </button>
          {track.duration && (
            <span className="media-card-duration">{track.duration}</span>
          )}
        </div>
        <div className="media-card-meta">
          <span className="media-card-title" title={title}>
            {title}
          </span>
          <span className="media-card-artist" title={artist}>
            {artist}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="spotify-home-container">
      {/* Compact Header: Single-Row Greeting & Streamlined Language Changer */}
      <div className="home-compact-header">
        <div className="home-greeting-area">
          <h1 className="home-greeting-heading">{getGreeting()}</h1>
          <span className="home-greeting-badge">Personalized Mix</span>
        </div>

        {/* Redesigned Streamlined Language & Region Selector */}
        <div className="home-lang-changer-wrapper" role="region" aria-label="Language and genre filter">
          <div
            className="mobile-header-avatar"
            onClick={onOpenSettings}
            role="button"
            tabIndex={0}
            title="Profile & Settings"
            aria-label="Profile and Settings"
          >
            <span>P</span>
          </div>
          <div className="home-lang-scroll-track">
            {LANGUAGE_FILTERS.map((lang) => {
              const isActive = language === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  className={`lang-pill-item ${isActive ? 'is-active' : ''}`}
                  onClick={() => onLanguageChange(lang.id)}
                  aria-pressed={isActive}
                >
                  <span className="lang-pill-icon">{lang.icon}</span>
                  <span className="lang-pill-name">{lang.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6-Pack Quick Access Grid */}
      <div className="quick-access-grid">
        {/* Liked Songs Quick Card */}
        <div className="quick-access-card liked-quick-card" onClick={onOpenLiked}>
          <div className="quick-card-thumb liked-gradient-thumb">
            <Heart size={22} fill="#ffffff" color="#ffffff" />
          </div>
          <div className="quick-card-info">
            <span className="quick-card-title">Liked Songs</span>
            <span className="quick-card-sub">{likedTracks.length} saved tracks</span>
          </div>
          <button
            type="button"
            className="quick-card-play-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (likedTracks.length > 0) {
                onPlayTrack(likedTracks[0], likedTracks);
              } else {
                onOpenLiked();
              }
            }}
            title="Play Liked Songs"
            aria-label="Play Liked Songs"
          >
            <Play size={16} fill="currentColor" />
          </button>
        </div>

        {/* Existing Playlists Cards */}
        {playlists.slice(0, 5).map((pl) => (
          <div
            key={pl.id}
            className="quick-access-card"
            onClick={() => onOpenPlaylist(pl.id)}
          >
            {pl.coverUrl ? (
              <img
                src={pl.coverUrl}
                alt={pl.name}
                className="quick-card-thumb"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_ARTWORK;
                }}
              />
            ) : (
              <div className="quick-card-thumb fallback-thumb">
                <Music size={20} />
              </div>
            )}
            <div className="quick-card-info">
              <span className="quick-card-title" title={pl.name}>
                {pl.name}
              </span>
              <span className="quick-card-sub">{pl.tracks.length} tracks</span>
            </div>
            <button
              type="button"
              className="quick-card-play-btn"
              onClick={(e) => {
                e.stopPropagation();
                onPlayPlaylist(pl);
              }}
              title={`Play ${pl.name}`}
              aria-label={`Play ${pl.name}`}
            >
              <Play size={16} fill="currentColor" />
            </button>
          </div>
        ))}
      </div>

      {/* SECTION 1: Made For You (Smart Algorithm based on Likings + Song Selection + Searches) */}
      {madeForYouTracks.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <div>
              <h2 className="home-section-title">
                <Compass size={18} color="var(--accent-primary)" />
                Made For You
              </h2>
              <p className="home-section-sub">
                Tuned to your liked tracks, song choices, and listening history
              </p>
            </div>
          </div>

          <div className="home-cards-scroll">
            {madeForYouTracks.slice(0, 8).map((track) =>
              renderCard(track, madeForYouTracks, 'made-for-you')
            )}
          </div>
        </section>
      )}

      {/* SECTION 2: Dynamic Regional & Language Radar */}
      <section className="home-section">
        <div className="home-section-header">
          <div>
            <h2 className="home-section-title">
              <Compass size={18} color="var(--accent-primary)" />
              {language === 'all' ? 'Trending Worldwide' : `Trending in ${selectedLangObj.name}`}
            </h2>
            <p className="home-section-sub">
              Top tracks curated for {selectedLangObj.name}
            </p>
          </div>
          <button
            type="button"
            className="section-see-all-btn"
            onClick={() => onExploreQuery(selectedLangObj.name, 'songs')}
          >
            Explore all <ChevronRight size={13} />
          </button>
        </div>

        <div className="home-cards-scroll">
          {isLanguageLoading ? (
            <div className="home-loading-banner">
              <Radio size={16} className="spin-animate" color="var(--accent-primary)" />
              <span>Fetching {selectedLangObj.name} hits...</span>
            </div>
          ) : languageTracks.length > 0 ? (
            languageTracks.slice(0, 8).map((track) =>
              renderCard(track, languageTracks, 'lang')
            )
          ) : (
            <div className="home-loading-banner">
              <span>Explore music in {selectedLangObj.name}</span>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 3: Based on Your Recent Search History */}
      {searchRecQuery && searchRecTracks.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <div>
              <h2 className="home-section-title">
                <Music size={18} color="var(--accent-primary)" />
                Because you searched for "{searchRecQuery}"
              </h2>
              <p className="home-section-sub">
                Hand-picked tracks matching your recent searches
              </p>
            </div>
            <button
              type="button"
              className="section-see-all-btn"
              onClick={() => onExploreQuery(searchRecQuery, 'songs')}
            >
              More like this <ChevronRight size={13} />
            </button>
          </div>

          <div className="home-cards-scroll">
            {searchRecTracks.slice(0, 8).map((track) =>
              renderCard(track, searchRecTracks, 'rec')
            )}
          </div>
        </section>
      )}

      {/* SECTION 4: Recently Played / Jump Back In */}
      {recentTracks && recentTracks.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <div>
              <h2 className="home-section-title">
                <Clock size={18} color="var(--accent-primary)" />
                Jump Back In
              </h2>
              <p className="home-section-sub">Resume your recent listening session</p>
            </div>
          </div>

          <div className="home-cards-scroll">
            {recentTracks.slice(0, 8).map((track) =>
              renderCard(track, recentTracks, 'recent')
            )}
          </div>
        </section>
      )}

      {/* SECTION 5: Theme & Atmosphere Soundscape */}
      {themeTracks && themeTracks.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <div>
              <h2 className="home-section-title">
                <Radio size={18} color="var(--accent-primary)" />
                {getThemeTitle()}
              </h2>
              <p className="home-section-sub">
                Atmospheric soundscapes attuned to your amber desktop palette
              </p>
            </div>
          </div>

          <div className="home-cards-scroll">
            {themeTracks.slice(0, 8).map((track) =>
              renderCard(track, themeTracks, 'theme')
            )}
          </div>
        </section>
      )}

      {/* SECTION 6: New Releases & Fresh Drops */}
      <section className="home-section">
        <div className="home-section-header">
          <div>
            <h2 className="home-section-title">
              <Flame size={18} color="var(--accent-primary)" />
              New Releases &amp; Fresh Drops
            </h2>
            <p className="home-section-sub">
              Newly published music trending on YouTube Music
            </p>
          </div>
          <button
            type="button"
            className="section-see-all-btn"
            onClick={() => onExploreQuery('New Releases', 'new_releases')}
          >
            Explore all <ChevronRight size={13} />
          </button>
        </div>

        <div className="home-cards-scroll">
          {newReleases.length > 0 ? (
            newReleases.slice(0, 8).map((track) =>
              renderCard(track, newReleases, 'nr')
            )
          ) : (
            <div className="home-loading-banner">
              <Flame size={16} className="spin-animate" color="var(--accent-primary)" />
              <span>Fetching latest releases...</span>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 7: Curated Playlists & Mixes */}
      {playlists.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <div>
              <h2 className="home-section-title">
                <Disc3 size={18} color="var(--accent-primary)" />
                Your Playlists &amp; Mixes
              </h2>
              <p className="home-section-sub">Custom collections and hand-crafted stations</p>
            </div>
          </div>

          <div className="home-cards-scroll">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="music-media-card playlist-card"
                onClick={() => onOpenPlaylist(pl.id)}
                role="button"
                tabIndex={0}
              >
                <div className="media-card-artwork">
                  {pl.coverUrl ? (
                    <img
                      src={pl.coverUrl}
                      alt={pl.name}
                      className="media-card-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_ARTWORK;
                      }}
                    />
                  ) : (
                    <div className="media-card-fallback">
                      <Music size={28} />
                    </div>
                  )}
                  <button
                    type="button"
                    className="media-card-hover-play"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayPlaylist(pl);
                    }}
                    title={`Play ${pl.name}`}
                    aria-label={`Play ${pl.name}`}
                  >
                    <Play size={18} fill="currentColor" />
                  </button>
                </div>
                <div className="media-card-meta">
                  <span className="media-card-title" title={pl.name}>
                    {pl.name}
                  </span>
                  <span className="media-card-artist" title={pl.description || 'Playlist'}>
                    {pl.tracks.length} {pl.tracks.length === 1 ? 'track' : 'tracks'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 8: More Related Music Videos & Visualizers (Scroll to Discover) */}
      {moreVideos.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <div>
              <h2 className="home-section-title">
                <Video size={18} color="var(--accent-primary)" />
                Trending Music Videos &amp; Visualizers
              </h2>
              <p className="home-section-sub">
                Official music videos, acoustic visuals, and live performances
              </p>
            </div>
          </div>

          <div className="home-cards-scroll">
            {moreVideos.map((track) =>
              renderCard(track, moreVideos, 'more-vid')
            )}
          </div>
        </section>
      )}

      {/* Infinite Scroll Bottom Sentinel / Loader */}
      <div className="home-bottom-scroll-trigger" ref={bottomSentinelRef}>
        {isLoadingMoreVideos ? (
          <div className="home-loading-banner">
            <Loader2 size={16} className="spin-animate" color="var(--accent-primary)" />
            <span>Discovering more related music & videos...</span>
          </div>
        ) : (
          <button
            type="button"
            className="home-load-more-btn"
            onClick={fetchMoreHomeVideos}
          >
            <Video size={14} />
            <span>Fetch More Related Videos &amp; Tracks</span>
          </button>
        )}
      </div>
    </div>
  );
};
