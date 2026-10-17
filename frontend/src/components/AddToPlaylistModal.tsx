import React, { useState } from 'react';
import { X, Check, Plus, Music, ListPlus } from 'lucide-react';
import type { Playlist, MusicTrack } from '../types';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: MusicTrack | null;
  playlists: Playlist[];
  onAddToPlaylist: (playlistId: string, track: MusicTrack) => void;
  onCreateAndAdd: (playlistName: string, track: MusicTrack) => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  onClose,
  track,
  playlists,
  onAddToPlaylist,
  onCreateAndAdd,
}) => {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen || !track) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    onCreateAndAdd(newPlaylistName.trim(), track);
    setNewPlaylistName('');
    setIsCreating(false);
    onClose();
  };

  return (
    <div className="pro-modal-backdrop" onClick={onClose}>
      <div
        className="add-to-playlist-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="add-modal-header">
          <div className="add-modal-title-wrap">
            <ListPlus size={22} color="var(--accent-primary)" />
            <h2>Add to Playlist</h2>
          </div>
          <button
            type="button"
            className="add-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Selected Track Preview Pill */}
        <div className="add-modal-track-pill">
          <img
            src={track.thumbnailUrl}
            alt={track.title}
            className="add-modal-track-thumb"
          />
          <div className="add-modal-track-info">
            <span className="add-modal-track-title" title={track.title}>
              {track.title}
            </span>
            <span className="add-modal-track-artist" title={track.artist}>
              {track.artist}
            </span>
          </div>
        </div>

        {/* Playlists Picker List */}
        <div className="add-modal-playlist-scroll">
          {playlists.length > 0 ? (
            playlists.map((pl) => {
              const alreadyHasTrack = pl.tracks.some((t) => t.id === track.id);
              return (
                <button
                  key={pl.id}
                  type="button"
                  className={`add-playlist-row-item ${alreadyHasTrack ? 'is-already-added' : ''}`}
                  onClick={() => {
                    onAddToPlaylist(pl.id, track);
                    onClose();
                  }}
                >
                  <div className="add-playlist-row-thumb">
                    {pl.coverUrl ? (
                      <img src={pl.coverUrl} alt="" className="add-playlist-img" />
                    ) : (
                      <div className="add-playlist-fallback">
                        <Music size={18} />
                      </div>
                    )}
                  </div>

                  <div className="add-playlist-row-meta">
                    <span className="add-playlist-name">{pl.name}</span>
                    <span className="add-playlist-sub">
                      {pl.isCustom ? 'Custom' : 'Mix'} • {pl.tracks.length}{' '}
                      {pl.tracks.length === 1 ? 'song' : 'songs'}
                    </span>
                  </div>

                  {alreadyHasTrack ? (
                    <span className="add-playlist-status-tag added">
                      <Check size={14} /> Added
                    </span>
                  ) : (
                    <span className="add-playlist-status-tag add-action">
                      <Plus size={14} /> Add
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="add-modal-empty-state">
              <ListPlus size={24} color="var(--accent-primary)" />
              <p>No custom playlists yet. Create your first one below!</p>
            </div>
          )}
        </div>

        {/* Bottom Section: Create New Playlist */}
        <div className="add-modal-footer">
          {isCreating ? (
            <form onSubmit={handleCreateSubmit} className="add-modal-inline-create-form">
              <input
                type="text"
                autoFocus
                className="add-modal-inline-input"
                placeholder="Give your playlist a name..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                maxLength={50}
              />
              <div className="add-modal-inline-actions">
                <button
                  type="button"
                  className="add-modal-btn-cancel-inline"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="add-modal-btn-create-inline"
                  disabled={!newPlaylistName.trim()}
                >
                  Save &amp; Add
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="add-modal-create-trigger-btn"
              onClick={() => setIsCreating(true)}
            >
              <Plus size={18} />
              <span>Create New Playlist</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

