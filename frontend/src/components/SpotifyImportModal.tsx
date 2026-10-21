import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Link2,
  Check,
  FolderPlus,
  RefreshCw,
  Clock,
  Clipboard,
} from 'lucide-react';
import type { Playlist, MusicTrack } from '../types';
import { searchTracks, resolveSpotifyUrl } from '../services/api';

interface SpotifyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  initialPlaylistId?: string | null;
  onImportTracks: (
    destination: { type: 'new'; name: string } | { type: 'existing'; playlistId: string },
    tracks: MusicTrack[]
  ) => void;
}

interface MatchedItem {
  id: string;
  originalText: string;
  track: MusicTrack;
  selected: boolean;
}

export const SpotifyImportModal: React.FC<SpotifyImportModalProps> = ({
  isOpen,
  onClose,
  playlists,
  initialPlaylistId,
  onImportTracks,
}) => {
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState('');
  const [loadProgress, setLoadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [matchedItems, setMatchedItems] = useState<MatchedItem[]>([]);
  const [destinationType, setDestinationType] = useState<'new' | 'existing'>('new');
  const [newPlaylistName, setNewPlaylistName] = useState('Spotify Import');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    initialPlaylistId || playlists[0]?.id || ''
  );

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initialize modal state on open
  useEffect(() => {
    if (isOpen) {
      setSpotifyUrl('');
      setIsLoading(false);
      setLoadStatus('');
      setLoadProgress(0);
      setErrorMessage(null);
      setMatchedItems([]);

      if (initialPlaylistId) {
        setDestinationType('existing');
        setSelectedPlaylistId(initialPlaylistId);
      } else {
        setDestinationType('new');
        if (playlists.length > 0) {
          setSelectedPlaylistId(playlists[0].id);
        }
      }

      const dateStr = new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      setNewPlaylistName(`Spotify Import • ${dateStr}`);

      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, initialPlaylistId, playlists]);

  if (!isOpen) return null;

  // Selected target playlist for duplicate checking
  const targetPlaylist =
    destinationType === 'existing'
      ? playlists.find((p) => p.id === selectedPlaylistId)
      : null;

  // Strict duplicate check against target playlist
  const isDuplicateOfPlaylist = (track: MusicTrack): boolean => {
    if (!targetPlaylist) return false;
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    return targetPlaylist.tracks.some(
      (t) =>
        t.id === track.id ||
        (clean(t.title) === clean(track.title) && clean(t.artist) === clean(track.artist))
    );
  };

  // Resolve Spotify URL and search YouTube Music catalog
  const handleFetchTracks = async (overrideUrl?: string) => {
    const urlToFetch = (overrideUrl !== undefined ? overrideUrl : spotifyUrl).trim();

    if (!urlToFetch) {
      setErrorMessage('Please paste a Spotify link.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setLoadProgress(15);
    setLoadStatus('Fetching playlist details from Spotify...');

    try {
      const data = await resolveSpotifyUrl(urlToFetch);

      if (!data.tracks || data.tracks.length === 0) {
        throw new Error('No tracks found in this Spotify link.');
      }

      if (destinationType === 'new') {
        setNewPlaylistName(data.title || 'Spotify Import');
      }

      setLoadProgress(60);
      setLoadStatus(`Imported ${data.tracks.length} tracks from Spotify.`);

      const formatDuration = (secs?: number) => {
        if (!secs || secs <= 0) return '3:30';
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
      };

      // Instantly map all resolved Spotify tracks with rich metadata
      // On-demand audio stream resolution in PlayerTestPanel resolves playable streams when clicked
      const matched: MatchedItem[] = data.tracks.map((t, idx) => {
        const durSecs = t.duration || 210;
        const cleanId = `sp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
        const q = t.artist ? `${t.title} ${t.artist}` : t.title;

        return {
          id: cleanId,
          originalText: q,
          track: {
            id: cleanId,
            title: t.title,
            artist: t.artist || 'Unknown Artist',
            album: data.title || 'Spotify Playlist',
            duration: formatDuration(durSecs),
            durationSeconds: durSecs,
            thumbnailUrl:
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
            youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
            isEmbeddableCandidate: false, // on-demand stream resolution resolves 11-char ID dynamically when played
            source: 'spotify',
          },
          selected: true,
        };
      });

      setMatchedItems(matched);
      setLoadProgress(100);
      setIsLoading(false);
      setLoadStatus('');
    } catch (err: any) {
      console.error('Spotify import error:', err);
      setErrorMessage(err.message || 'Failed to import tracks from this Spotify URL.');
      setIsLoading(false);
      setLoadStatus('');
    }
  };

  // One-click clipboard paste
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          const trimmed = text.trim();
          setSpotifyUrl(trimmed);
          setErrorMessage(null);
          // Auto-fetch immediately if user pastes a spotify link
          if (trimmed.includes('spotify.com') || trimmed.startsWith('spotify:')) {
            handleFetchTracks(trimmed);
          }
        }
      }
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleToggleSelect = (id: string) => {
    setMatchedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleSelectAll = (select: boolean) => {
    setMatchedItems((prev) =>
      prev.map((item) => {
        const isDupe = isDuplicateOfPlaylist(item.track);
        return {
          ...item,
          selected: isDupe ? false : select,
        };
      })
    );
  };

  const eligibleTracks = matchedItems.filter(
    (item) => item.selected && !isDuplicateOfPlaylist(item.track)
  );

  const duplicateCount = matchedItems.filter((item) =>
    isDuplicateOfPlaylist(item.track)
  ).length;

  const handleSubmit = () => {
    if (eligibleTracks.length === 0) return;

    const tracksToAdd = eligibleTracks.map((item) => item.track);

    if (destinationType === 'new') {
      const name = newPlaylistName.trim() || 'Spotify Import';
      onImportTracks({ type: 'new', name }, tracksToAdd);
    } else {
      if (!selectedPlaylistId) return;
      onImportTracks(
        { type: 'existing', playlistId: selectedPlaylistId },
        tracksToAdd
      );
    }

    onClose();
  };

  return (
    <div
      className="spotify-import-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="spotify-import-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="spotify-import-title"
      >
        {/* Header */}
        <div className="spotify-import-header">
          <div className="spotify-import-title-group">
            <div className="spotify-import-icon-box">
              <Link2 size={18} />
            </div>
            <div>
              <h2 id="spotify-import-title" className="spotify-import-title">
                Import from Spotify
              </h2>
              <p className="spotify-import-subtitle">
                Paste any playlist, album, or track link to import
              </p>
            </div>
          </div>

          <button
            type="button"
            className="spotify-import-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="spotify-import-body">
          {/* Paste Input Row */}
          <div className="spotify-import-input-wrap">
            <input
              ref={inputRef}
              type="url"
              className="spotify-import-input"
              placeholder="Paste Spotify link here..."
              value={spotifyUrl}
              onChange={(e) => {
                setSpotifyUrl(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleFetchTracks();
                }
              }}
              disabled={isLoading}
            />

            <button
              type="button"
              className="spotify-import-paste-btn"
              onClick={handlePasteClipboard}
              title="Paste from clipboard"
              disabled={isLoading}
            >
              <Clipboard size={14} />
              <span>Paste</span>
            </button>

            <button
              type="button"
              className="spotify-import-fetch-btn"
              onClick={() => handleFetchTracks()}
              disabled={isLoading || !spotifyUrl.trim()}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="spin-slow" />
                  <span>Loading...</span>
                </>
              ) : (
                <span>Import</span>
              )}
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="spotify-import-error">
              {errorMessage}
            </div>
          )}

          {/* Loading Progress */}
          {isLoading && (
            <div className="spotify-import-loading">
              <div className="spotify-import-loading-row">
                <span className="spotify-import-loading-text">{loadStatus}</span>
                <span className="spotify-import-loading-pct">{loadProgress}%</span>
              </div>
              <div className="spotify-import-progress-track">
                <div
                  className="spotify-import-progress-fill"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Results: Track List */}
          {matchedItems.length > 0 && !isLoading && (
            <div className="spotify-import-results">
              <div className="spotify-import-results-bar">
                <span className="spotify-import-results-count">
                  {matchedItems.length} tracks found • {eligibleTracks.length} ready to add
                  {duplicateCount > 0 && (
                    <span className="spotify-import-dupe-note">
                      ({duplicateCount} duplicate{duplicateCount === 1 ? '' : 's'} skipped)
                    </span>
                  )}
                </span>
                <div className="spotify-import-results-actions">
                  <button
                    type="button"
                    className="spotify-import-text-btn"
                    onClick={() => handleSelectAll(true)}
                  >
                    Select all
                  </button>
                  <span className="spotify-import-divider">•</span>
                  <button
                    type="button"
                    className="spotify-import-text-btn"
                    onClick={() => handleSelectAll(false)}
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              {/* Scrollable track list */}
              <div className="spotify-import-tracks-list">
                {matchedItems.map((item) => {
                  const isDupe = isDuplicateOfPlaylist(item.track);
                  return (
                    <div
                      key={item.id}
                      className={`spotify-import-track-row ${isDupe ? 'is-dupe' : ''} ${item.selected && !isDupe ? 'is-selected' : ''}`}
                      onClick={() => !isDupe && handleToggleSelect(item.id)}
                    >
                      <input
                        type="checkbox"
                        className="spotify-import-checkbox"
                        checked={item.selected && !isDupe}
                        disabled={isDupe}
                        onChange={() => handleToggleSelect(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />

                      <img
                        src={item.track.thumbnailUrl}
                        alt=""
                        className="spotify-import-track-thumb"
                      />

                      <div className="spotify-import-track-meta">
                        <span className="spotify-import-track-title">{item.track.title}</span>
                        <span className="spotify-import-track-artist">{item.track.artist}</span>
                      </div>

                      <div className="spotify-import-track-right">
                        {isDupe ? (
                          <span className="spotify-import-dupe-badge">Already added</span>
                        ) : (
                          <span className="spotify-import-track-time">
                            <Clock size={11} />
                            {item.track.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Destination choice */}
              <div className="spotify-import-dest-box">
                <div className="spotify-import-dest-title">
                  <FolderPlus size={15} />
                  <span>Destination</span>
                </div>

                <div className="spotify-import-dest-options">
                  <label className={`spotify-import-radio-opt ${destinationType === 'new' ? 'is-checked' : ''}`}>
                    <div className="spotify-import-radio-head">
                      <input
                        type="radio"
                        name="spotify-dest"
                        checked={destinationType === 'new'}
                        onChange={() => setDestinationType('new')}
                      />
                      <span>New Playlist</span>
                    </div>
                    {destinationType === 'new' && (
                      <input
                        type="text"
                        className="spotify-import-dest-text"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSubmit();
                          }
                        }}
                        placeholder="Playlist name..."
                      />
                    )}
                  </label>

                  <label className={`spotify-import-radio-opt ${destinationType === 'existing' ? 'is-checked' : ''} ${playlists.length === 0 ? 'is-disabled' : ''}`}>
                    <div className="spotify-import-radio-head">
                      <input
                        type="radio"
                        name="spotify-dest"
                        checked={destinationType === 'existing'}
                        disabled={playlists.length === 0}
                        onChange={() => setDestinationType('existing')}
                      />
                      <span>Existing Playlist</span>
                    </div>
                    {destinationType === 'existing' && (
                      <select
                        className="spotify-import-dest-select"
                        value={selectedPlaylistId}
                        onChange={(e) => setSelectedPlaylistId(e.target.value)}
                      >
                        {playlists.map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            {pl.name} ({pl.tracks.length} tracks)
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="spotify-import-footer">
          <button
            type="button"
            className="spotify-import-cancel-btn"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>

          <button
            type="button"
            className="spotify-import-submit-btn"
            onClick={handleSubmit}
            disabled={isLoading || eligibleTracks.length === 0}
          >
            <Check size={16} />
            <span>
              {eligibleTracks.length === 0
                ? 'No tracks selected'
                : `Import ${eligibleTracks.length} Track${eligibleTracks.length === 1 ? '' : 's'}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
