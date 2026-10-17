import React from 'react';
import type { MusicTrack } from '../types';
import { Play, Heart, Plus } from 'lucide-react';

interface TrackCardProps {
  track: MusicTrack;
  isActive: boolean;
  onSelectTrack: (track: MusicTrack) => void;
  isLiked?: boolean;
  onToggleLike?: (track: MusicTrack) => void;
  onOpenAddToPlaylist?: (track: MusicTrack) => void;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  isActive,
  onSelectTrack,
  isLiked = false,
  onToggleLike,
  onOpenAddToPlaylist,
}) => {
  return (
    <div
      className={`pro-media-card ${isActive ? 'is-active-playback' : ''}`}
      onClick={() => onSelectTrack(track)}
      title={`Play ${track.title}`}
    >
      <div className="media-card-cover-wrapper">
        <img
          src={track.thumbnailUrl}
          alt={track.title}
          className="media-card-image"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60';
          }}
        />

        {track.duration && (
          <span className="media-card-duration-badge">{track.duration}</span>
        )}

        <button
          type="button"
          className="media-card-hover-play-btn"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTrack(track);
          }}
          title={`Play ${track.title}`}
          aria-label={`Play ${track.title}`}
        >
          <Play size={20} fill="#05240c" color="#05240c" style={{ marginLeft: 2 }} />
        </button>
      </div>

      <div className="media-card-content">
        <h4 className="media-card-song-title" title={track.title}>
          {track.title}
        </h4>
        <span className="media-card-artist-name" title={track.artist}>
          {track.artist}
        </span>
        {track.album && (
          <span className="media-card-album-name" title={track.album}>
            {track.album}
          </span>
        )}
      </div>

      <div className="media-card-action-bar">
        {onToggleLike && (
          <button
            type="button"
            className={`media-quick-action-btn ${isLiked ? 'is-liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike(track);
            }}
            title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          >
            <Heart size={16} fill={isLiked ? 'var(--accent-primary)' : 'none'} />
          </button>
        )}

        {onOpenAddToPlaylist && (
          <button
            type="button"
            className="media-quick-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAddToPlaylist(track);
            }}
            title="Add to playlist"
          >
            <Plus size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
