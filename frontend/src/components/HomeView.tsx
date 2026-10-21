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
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { Playlist, MusicTrack, ThemePalette } from '../types';
import { searchTracks } from '../services/api';
import { filterMusicTracks } from '../services/autoMixes';

interface HomeViewProps {
  playlists: Playlist[];
  autoMixes?: Playlist[];
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
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

// High-End Shimmering Skeleton Card Loader for Home Shelves
export const SkeletonMediaCard: React.FC = () => (
  <div className="music-media-card skeleton-card" aria-hidden="true">
    <div className="media-card-artwork skeleton-thumb skeleton-shimmer" />
    <div className="media-card-meta">
      <div className="skeleton-line skeleton-line-title skeleton-shimmer" />
      <div className="skeleton-line skeleton-line-sub skeleton-shimmer" />
    </div>
  </div>
);

export const SkeletonRow: React.FC<{ count?: number }> = ({ count = 12 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonMediaCard key={i} />
    ))}
  </>
);

const LANGUAGE_FILTERS = [
  { id: 'all', name: 'All Music', mobileName: 'All' },
  { id: 'malayalam', name: 'Malayalam', mobileName: 'Malayalam' },
  { id: 'tamil', name: 'Tamil', mobileName: 'Tamil' },
  { id: 'hindi', name: 'Hindi', mobileName: 'Hindi' },
  { id: 'telugu', name: 'Telugu', mobileName: 'Telugu' },
  { id: 'punjabi', name: 'Punjabi', mobileName: 'Punjabi' },
  { id: 'kannada', name: 'Kannada', mobileName: 'Kannada' },
  { id: 'bengali', name: 'Bengali', mobileName: 'Bengali' },
  { id: 'music', name: 'Music Hits', mobileName: 'Hits' },
  { id: 'english', name: 'Global Pop', mobileName: 'Pop' },
  { id: 'lofi', name: 'Lo-Fi Chill', mobileName: 'Lo-Fi' },
  { id: 'podcasts', name: 'Podcasts & Talk', mobileName: 'Podcasts' },
];

export const HomeView: React.FC<HomeViewProps> = ({
  playlists,
  autoMixes = [],
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
    if (theme === 'noir') return 'Midnight Pure Black Soundscape';
    if (theme === 'cyber') return 'Cyber & Synthwave Pulse';
    if (theme === 'amber') return 'Golden Hour & Soulful Warmth';
    return 'Aurora Chill & Indie Soundscape';
  };

  const selectedLangObj = LANGUAGE_FILTERS.find((l) => l.id === language) || LANGUAGE_FILTERS[0];

  // Dynamic Scroll-to-Discover Algorithmic Tracks at Bottom of Home (Pure Music Only)
  const [discoveryTracks, setDiscoveryTracks] = useState<MusicTrack[]>([]);
  const [discoveryPage, setDiscoveryPage] = useState<number>(1);
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState<boolean>(false);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

  const fetchMoreDiscoveryTracks = useCallback(async () => {
    if (isLoadingDiscovery) return;
    setIsLoadingDiscovery(true);
    try {
      const q =
        language && language !== 'all'
          ? `${language} songs top hits`
          : 'trending top hits songs';
      const res = await searchTracks(q, discoveryPage, 12, 'ytmusicapi', 'songs');
      const clean = filterMusicTracks(res.items);
      if (clean.length > 0) {
        setDiscoveryTracks((prev) => {
          const map = new Map<string, MusicTrack>();
          prev.forEach((t) => map.set(t.id, t));
          clean.forEach((t) => map.set(t.id, t));
          return Array.from(map.values());
        });
        setDiscoveryPage((p) => p + 1);
      }
    } catch (err) {
      console.warn('Could not fetch discovery tracks for Home:', err);
    } finally {
      setIsLoadingDiscovery(false);
    }
  }, [language, discoveryPage, isLoadingDiscovery]);

  // Initial fetch for bottom algorithmic discovery or on language change
  useEffect(() => {
    let active = true;
    const initialQuery =
      language && language !== 'all'
        ? `${language} songs top hits`
        : 'trending top hits songs';
    searchTracks(initialQuery, 1, 12, 'ytmusicapi', 'songs')
      .then((res) => {
        const clean = filterMusicTracks(res.items);
        if (active && clean.length > 0) {
          setDiscoveryTracks(clean);
          setDiscoveryPage(2);
        }
      })
      .catch((e) => console.warn('Home discovery tracks fetch:', e));
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
        if (entries[0].isIntersecting && !isLoadingDiscovery) {
          fetchMoreDiscoveryTracks();
        }
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchMoreDiscoveryTracks, isLoadingDiscovery]);

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
          <span className="media-card-type">
            {track.resultType === 'artist'
              ? 'Artist'
              : track.resultType === 'album'
              ? 'Album'
              : track.resultType === 'playlist'
              ? 'Playlist'
              : track.album
              ? 'Album'
              : (track.durationSeconds && track.durationSeconds < 240)
              ? 'Single'
              : 'Song'}
          </span>
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
                  <span className="lang-pill-name">{lang.name}</span>
                  <span className="lang-pill-mobile-name">{lang.mobileName}</span>
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
                <Compass size={18} className="section-title-icon" color="var(--accent-primary)" />
                <span className="section-heading-desktop">Made For You</span>
                <span className="section-heading-mobile">Recommended for today</span>
              </h2>
              <p className="home-section-sub">
                Tuned to your liked tracks, song choices, and listening history
              </p>
            </div>
          </div>

          <div className="home-cards-scroll">
            {madeForYouTracks.slice(0, 12).map((track) =>
              renderCard(track, madeForYouTracks, 'made-for-you')
            )}
          </div>
        </section>
      )}

      {/* SECTION 2: Dynamic Regional & Language Radar */}
      <section className="home-section">
        <div className="home-section-header">
          <div className="home-section-title-wrap">
            <h2 className="home-section-title">
              <Compass size={18} className="section-title-icon" color="var(--accent-primary)" />
              <span>{language === 'all' ? 'Trending Worldwide' : `Trending in ${selectedLangObj.name}`}</span>
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
            <SkeletonRow count={12} />
          ) : languageTracks.length > 0 ? (
            languageTracks.slice(0, 12).map((track) =>
              renderCard(track, languageTracks, 'lang')
            )
          ) : (
            <SkeletonRow count={12} />
          )}
        </div>
      </section>

      {/* SECTION 3: Based on Your Recent Search History */}
      {searchRecQuery && searchRecTracks.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <div className="home-section-title-wrap">
              <h2 className="home-section-title">
                <Music size={18} className="section-title-icon" color="var(--accent-primary)" />
                <span className="section-heading-desktop">Because you searched for "{searchRecQuery}"</span>
                <span className="section-heading-mobile">Albums featuring songs you like</span>
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
            {searchRecTracks.slice(0, 12).map((track) =>
              renderCard(track, searchRecTracks, 'rec')
            )}
          </div>
        </section>
      )}

      {/* SECTION 4: Recently Played / Jump Back In */}
      {recentTracks && recentTracks.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <div className="home-section-title-wrap">
              <h2 className="home-section-title">
                <Clock size={18} color="var(--accent-primary)" />
                Jump Back In
              </h2>
              <p className="home-section-sub">Resume your recent listening session</p>
            </div>
          </div>

          <div className="home-cards-scroll">
            {recentTracks.slice(0, 12).map((track) =>
              renderCard(track, recentTracks, 'recent')
            )}
          </div>
        </section>
      )}

      {/* SECTION 5: Theme & Atmosphere Soundscape */}
      {themeTracks && themeTracks.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <div className="home-section-title-wrap">
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
            {themeTracks.slice(0, 12).map((track) =>
              renderCard(track, themeTracks, 'theme')
            )}
          </div>
        </section>
      )}

      {/* SECTION 6: New Releases & Fresh Drops */}
      <section className="home-section">
        <div className="home-section-header">
          <div className="home-section-title-wrap">
            <h2 className="home-section-title">
              <Flame size={18} className="section-title-icon" color="var(--accent-primary)" />
              <span>New Releases &amp; Fresh Drops</span>
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
            newReleases.slice(0, 12).map((track) =>
              renderCard(track, newReleases, 'nr')
            )
          ) : (
            <SkeletonRow count={12} />
          )}
        </div>
      </section>

      {/* SECTION 7: Real Algorithmic Auto Playlists & Daily Mixes */}
      {((autoMixes && autoMixes.length > 0) ||
        playlists.some((p) => p.isCustom && p.tracks && p.tracks.length > 0 && p.name !== 'Late Night Drive' && p.name !== 'My Chill Mix')) && (
        <section className="home-section">
          <div className="home-section-header">
            <div>
              <h2 className="home-section-title">
                <Disc3 size={18} color="var(--accent-primary)" />
                Made For You &amp; Daily Mixes
              </h2>
              <p className="home-section-sub">
                Handcrafted stations and personalized mixes tailored to your taste
              </p>
            </div>
          </div>

          <div className="home-cards-scroll">
            {/* Real Auto-Generated Mixes */}
            {autoMixes &&
              autoMixes.map((mix) => (
                <div
                  key={mix.id}
                  className="music-media-card playlist-card"
                  onClick={() => onOpenPlaylist(mix.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="media-card-artwork">
                    {mix.coverUrl ? (
                      <img
                        src={mix.coverUrl}
                        alt={mix.name}
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
                        onPlayPlaylist(mix);
                      }}
                      title={`Play ${mix.name}`}
                      aria-label={`Play ${mix.name}`}
                    >
                      <Play size={18} fill="currentColor" />
                    </button>
                  </div>
                  <div className="media-card-meta">
                    <span className="media-card-type">Daily Mix</span>
                    <span className="media-card-title" title={mix.name}>
                      {mix.name}
                    </span>
                    <span className="media-card-artist" title={mix.description || `${mix.tracks.length} tracks`}>
                      {mix.description || `${mix.tracks.length} tracks`}
                    </span>
                  </div>
                </div>
              ))}

            {/* User Custom Created Playlists (Only those containing real tracks) */}
            {playlists
              .filter(
                (p) =>
                  p.isCustom &&
                  p.tracks &&
                  p.tracks.length > 0 &&
                  p.name !== 'Late Night Drive' &&
                  p.name !== 'My Chill Mix'
              )
              .map((pl) => (
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
                    <span className="media-card-type">Your Playlist</span>
                    <span className="media-card-title" title={pl.name}>
                      {pl.name}
                    </span>
                    <span className="media-card-artist" title={pl.description || `${pl.tracks.length} tracks`}>
                      {pl.tracks.length} {pl.tracks.length === 1 ? 'track' : 'tracks'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* SECTION 8: Recommended Radio & Discovery (Pure music tracks only) */}
      {discoveryTracks.length > 0 && (
        <section className="home-section">
          <div className="home-section-header">
            <div>
              <h2 className="home-section-title">
                <Radio size={18} color="var(--accent-primary)" />
                Recommended Radio &amp; Discovery
              </h2>
              <p className="home-section-sub">
                Fresh songs and popular favorites attuned to your region
              </p>
            </div>
          </div>

          <div className="home-cards-scroll">
            {discoveryTracks.map((track) =>
              renderCard(track, discoveryTracks, 'disc-track')
            )}
          </div>
        </section>
      )}

      {/* Infinite Scroll Bottom Sentinel / Loader */}
      <div className="home-bottom-scroll-trigger" ref={bottomSentinelRef}>
        {isLoadingDiscovery ? (
          <div className="home-cards-scroll">
            <SkeletonRow count={4} />
          </div>
        ) : (
          <button
            type="button"
            className="home-load-more-btn"
            onClick={fetchMoreDiscoveryTracks}
          >
            <Radio size={14} />
            <span>Discover More Songs</span>
          </button>
        )}
      </div>
    </div>
  );
};
