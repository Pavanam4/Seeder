import React, { useState } from 'react';
import { X, ListPlus, Image, Check, Music } from 'lucide-react';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string, coverUrl?: string) => void;
}

const PRESET_ARTWORKS = [
  {
    id: 'cyber',
    name: 'Midnight Neon',
    tag: 'Synth & Night',
    url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'emerald',
    name: 'Emerald Lush',
    tag: 'Lo-Fi & Chill',
    url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'amber',
    name: 'Golden Vinyl',
    tag: 'Acoustic & Soul',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'ocean',
    name: 'Cosmic Ocean',
    tag: 'Deep Focus',
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'sunset',
    name: 'Sunset Horizon',
    tag: 'Summer Vibes',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'vintage',
    name: 'Retro Studio',
    tag: 'Classics',
    url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
  },
];

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState(PRESET_ARTWORKS[0]);
  const [customCoverUrl, setCustomCoverUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || 'My Custom Playlist';
    const finalCover = customCoverUrl.trim() || selectedArtwork.url;
    onCreate(finalName, description.trim() || undefined, finalCover);
    setName('');
    setDescription('');
    setCustomCoverUrl('');
    onClose();
  };

  const currentPreviewUrl = customCoverUrl.trim() || selectedArtwork.url;

  return (
    <div className="pro-modal-backdrop" onClick={onClose}>
      <div
        className="pro-create-playlist-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="dialog-header-row">
          <div className="dialog-header-title">
            <div className="dialog-header-icon-box">
              <ListPlus size={20} className="dialog-header-icon" />
            </div>
            <div>
              <h2>Create New Playlist</h2>
              <span className="dialog-header-sub">Handcrafted collection for your music library</span>
            </div>
          </div>
          <button
            type="button"
            className="dialog-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-form-body">
          <div className="dialog-two-col">
            {/* Left: Cover Picker & Preview */}
            <div className="dialog-cover-selector-col">
              <span className="dialog-field-label">Selected Artwork</span>
              <div className="dialog-artwork-preview-box">
                <img
                  src={currentPreviewUrl}
                  alt="Playlist Cover Preview"
                  className="dialog-artwork-preview-img"
                  onError={() => setCustomCoverUrl('')}
                />
                <div className="dialog-artwork-overlay-tag">
                  <span>{customCoverUrl.trim() ? 'Custom URL' : selectedArtwork.name}</span>
                </div>
              </div>

              {/* Aesthetic Artwork Presets Grid */}
              <div className="dialog-preset-palettes">
                <span className="preset-label">Choose Aesthetic Style:</span>
                <div className="preset-cards-grid">
                  {PRESET_ARTWORKS.map((art) => (
                    <button
                      key={art.id}
                      type="button"
                      className={`preset-card-item ${selectedArtwork.id === art.id && !customCoverUrl ? 'is-selected' : ''}`}
                      onClick={() => {
                        setSelectedArtwork(art);
                        setCustomCoverUrl('');
                      }}
                      title={`${art.name} (${art.tag})`}
                    >
                      <img src={art.url} alt={art.name} className="preset-card-img" />
                      {selectedArtwork.id === art.id && !customCoverUrl && (
                        <div className="preset-check-badge">
                          <Check size={12} color="#fff" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Inputs */}
            <div className="dialog-inputs-col">
              <div className="dialog-field-group">
                <label htmlFor="playlist-name-input" className="dialog-field-label">
                  Playlist Name <span className="required-star">*</span>
                </label>
                <input
                  id="playlist-name-input"
                  type="text"
                  autoFocus
                  className="dialog-text-input"
                  placeholder="e.g. Late Night Drives, Chill Beats"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                />
              </div>

              <div className="dialog-field-group">
                <label htmlFor="playlist-desc-input" className="dialog-field-label">
                  Description <span className="optional-tag">(Optional)</span>
                </label>
                <textarea
                  id="playlist-desc-input"
                  className="dialog-textarea-input"
                  placeholder="Give your playlist a story or vibe..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={180}
                  rows={3}
                />
              </div>

              <div className="dialog-field-group">
                <label htmlFor="playlist-cover-url-input" className="dialog-field-label">
                  <Image size={14} /> Custom Image URL <span className="optional-tag">(Optional)</span>
                </label>
                <input
                  id="playlist-cover-url-input"
                  type="url"
                  className="dialog-text-input mini"
                  placeholder="https://images.unsplash.com/..."
                  value={customCoverUrl}
                  onChange={(e) => setCustomCoverUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="dialog-actions-row">
            <button type="button" className="dialog-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="dialog-btn-save"
              disabled={!name.trim()}
            >
              Create Playlist
            </button>
          </div>
        </form>
      </div>

      {/* Mobile-Only Dedicated Create Sheet (Compact, focused, never scrolls off-screen) */}
      <div
        className="mobile-create-playlist-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mobile-sheet-drag-handle" />
        <div className="mobile-sheet-header">
          <div className="mobile-sheet-title-wrap">
            <ListPlus size={18} className="mobile-sheet-icon" />
            <h3>Give your playlist a name</h3>
          </div>
          <button
            type="button"
            className="mobile-sheet-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mobile-sheet-form">
          <div className="mobile-sheet-input-box">
            <input
              type="text"
              autoFocus
              className="mobile-sheet-text-input"
              placeholder="My Playlist"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Compact Vibe / Artwork selector */}
          <div className="mobile-sheet-vibe-selector">
            <span className="mobile-vibe-label">Select Cover Style:</span>
            <div className="mobile-vibe-scroll-row">
              {PRESET_ARTWORKS.map((art) => (
                <button
                  key={art.id}
                  type="button"
                  className={`mobile-vibe-chip ${selectedArtwork.id === art.id && !customCoverUrl ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedArtwork(art);
                    setCustomCoverUrl('');
                  }}
                  title={art.name}
                >
                  <img src={art.url} alt={art.name} className="mobile-vibe-img" />
                  <span className="mobile-vibe-text">{art.name}</span>
                  {selectedArtwork.id === art.id && !customCoverUrl && (
                    <div className="mobile-vibe-badge">
                      <Check size={10} color="#fff" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mobile-sheet-actions-row">
            <button type="button" className="mobile-sheet-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="mobile-sheet-submit-btn"
              disabled={!name.trim()}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

