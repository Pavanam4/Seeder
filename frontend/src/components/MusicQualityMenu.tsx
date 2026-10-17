import React from 'react';
import { Check } from 'lucide-react';
import type { AudioQuality } from '../types';

interface MusicQualityMenuProps {
  isOpen: boolean;
  onClose: () => void;
  quality: AudioQuality;
  onQualityChange: (quality: AudioQuality) => void;
  position?: 'bottom' | 'top';
}

export const MUSIC_QUALITY_OPTIONS: { id: AudioQuality; label: string }[] = [
  { id: 'auto', label: 'Automatic' },
  { id: 'small', label: 'Low' },
  { id: 'medium', label: 'Normal' },
  { id: 'hd720', label: 'High' },
  { id: 'highres', label: 'Very High' },
];

export function getQualityLabel(quality: AudioQuality): string {
  const match = MUSIC_QUALITY_OPTIONS.find((opt) => opt.id === quality);
  return match ? match.label : 'Automatic';
}

export const MusicQualityMenu: React.FC<MusicQualityMenuProps> = ({
  isOpen,
  onClose,
  quality,
  onQualityChange,
  position = 'bottom',
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="music-quality-backdrop" onClick={onClose} />
      <div
        className={`music-quality-card-popover ${position === 'top' ? 'pos-top' : 'pos-bottom'}`}
        role="dialog"
        aria-label="Music Quality"
      >
        <h3 className="music-quality-header-title">Music Quality</h3>
        <div className="music-quality-divider" />

        <div className="music-quality-options-list">
          {MUSIC_QUALITY_OPTIONS.map((opt) => {
            const isSelected = opt.id === quality;
            return (
              <button
                key={opt.id}
                type="button"
                className={`music-quality-option-row ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  onQualityChange(opt.id);
                  onClose();
                }}
              >
                <span className="music-quality-option-label">{opt.label}</span>
                {isSelected && (
                  <Check size={18} strokeWidth={2.5} className="music-quality-check-icon" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
