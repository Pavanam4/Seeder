import React, { useEffect } from 'react';
import {
  X,
  Palette,
  Volume2,
  Sliders,
  Globe,
  Trash2,
  Check,
  ShieldCheck,
  Sparkles,
  Music,
  Info,
  Radio,
} from 'lucide-react';
import type { ThemePalette, AudioQuality } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemePalette;
  onThemeChange: (theme: ThemePalette) => void;
  audioQuality: AudioQuality;
  onQualityChange: (quality: AudioQuality) => void;
  musicLanguage: string;
  onLanguageChange: (lang: string) => void;
  onClearHistory: () => void;
  searchHistoryCount: number;
}

const THEMES: { id: ThemePalette; name: string; dotColor: string; desc: string }[] = [
  { id: 'amber', name: 'Warm Amber', dotColor: '#F59E0B', desc: 'Golden amber glow with deep obsidian tones' },
  { id: 'aurora', name: 'Emerald Aurora', dotColor: '#10B981', desc: 'Vibrant neon green inspired by northern lights' },
  { id: 'cyber', name: 'Cyber Violet', dotColor: '#8B5CF6', desc: 'Futuristic purple & deep electric synthwave' },
];

const QUALITIES: { id: AudioQuality; label: string; desc: string }[] = [
  { id: 'highres', label: 'Ultra High (1080p Stream)', desc: 'Highest available bitrate and dynamic range' },
  { id: 'hd720', label: 'High Quality (720p Stream)', desc: 'Crisp audio with fast buffering' },
  { id: 'medium', label: 'Standard (360p Stream)', desc: 'Optimized data saving for mobile networks' },
  { id: 'auto', label: 'Adaptive Dynamic (Auto)', desc: 'Automatically adjusts based on connection speed' },
];

const LANGUAGES = [
  { id: 'all', name: 'Global Hits (All)' },
  { id: 'malayalam', name: 'Malayalam' },
  { id: 'tamil', name: 'Tamil' },
  { id: 'hindi', name: 'Hindi' },
  { id: 'punjabi', name: 'Punjabi' },
  { id: 'english', name: 'English' },
  { id: 'synthwave', name: 'Synthwave' },
  { id: 'lofi', name: 'Lo-Fi Chill' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  audioQuality,
  onQualityChange,
  musicLanguage,
  onLanguageChange,
  onClearHistory,
  searchHistoryCount,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div
        className="settings-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Header */}
        <div className="settings-dialog-header">
          <div className="settings-header-left">
            <div className="settings-profile-avatar">
              <span>P</span>
            </div>
            <div>
              <h2 id="settings-title" className="settings-dialog-title">
                Settings & Preferences
              </h2>
              <p className="settings-dialog-subtitle">Personalize your audio and interface</p>
            </div>
          </div>
          <button
            type="button"
            className="settings-close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="settings-dialog-body">
          {/* Section 1: Appearance */}
          <section className="settings-group">
            <div className="settings-group-header">
              <Palette size={18} className="settings-group-icon" />
              <div>
                <h3 className="settings-group-title">Theme Palette</h3>
                <p className="settings-group-desc">Select primary color accent across all views</p>
              </div>
            </div>
            <div className="settings-options-list">
              {THEMES.map((t) => (
                <div
                  key={t.id}
                  className={`settings-option-item ${theme === t.id ? 'is-selected' : ''}`}
                  onClick={() => onThemeChange(t.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="settings-option-info">
                    <span
                      className="settings-theme-dot"
                      style={{ backgroundColor: t.dotColor }}
                    />
                    <div>
                      <span className="settings-option-label">{t.name}</span>
                      <span className="settings-option-subtext">{t.desc}</span>
                    </div>
                  </div>
                  {theme === t.id && (
                    <div className="settings-check-badge">
                      <Check size={14} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Audio Quality */}
          <section className="settings-group">
            <div className="settings-group-header">
              <Sliders size={18} className="settings-group-icon" />
              <div>
                <h3 className="settings-group-title">Streaming Audio Quality</h3>
                <p className="settings-group-desc">Direct playback stream fidelity</p>
              </div>
            </div>
            <div className="settings-options-list">
              {QUALITIES.map((q) => (
                <div
                  key={q.id}
                  className={`settings-option-item ${audioQuality === q.id ? 'is-selected' : ''}`}
                  onClick={() => onQualityChange(q.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="settings-option-info">
                    <Music size={16} className="settings-quality-icon" />
                    <div>
                      <span className="settings-option-label">{q.label}</span>
                      <span className="settings-option-subtext">{q.desc}</span>
                    </div>
                  </div>
                  {audioQuality === q.id && (
                    <div className="settings-check-badge">
                      <Check size={14} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Regional & Language Engine */}
          <section className="settings-group">
            <div className="settings-group-header">
              <Globe size={18} className="settings-group-icon" />
              <div>
                <h3 className="settings-group-title">Regional Music Discovery</h3>
                <p className="settings-group-desc">Tailors trending feeds and home recommendation mixes</p>
              </div>
            </div>
            <div className="settings-chips-grid">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  className={`settings-chip-btn ${musicLanguage === lang.id ? 'is-active' : ''}`}
                  onClick={() => onLanguageChange(lang.id)}
                >
                  {musicLanguage === lang.id && <Check size={12} style={{ marginRight: 4 }} />}
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Section 4: Sound & Volume Consistency */}
          <section className="settings-group">
            <div className="settings-group-header">
              <Volume2 size={18} className="settings-group-icon" />
              <div>
                <h3 className="settings-group-title">Audio Normalization & Volume Lock</h3>
                <p className="settings-group-desc">Consistent volume output across video and audio changes</p>
              </div>
            </div>
            <div className="settings-status-box">
              <div className="status-box-row">
                <ShieldCheck size={18} color="var(--accent-primary)" />
                <span className="status-box-title">Smart Volume Lock Active</span>
              </div>
              <p className="status-box-desc">
                Automatically prevents YouTube iframe volume resets during track and video switches.
              </p>
            </div>
          </section>

          {/* Section 5: History & Data */}
          <section className="settings-group">
            <div className="settings-group-header">
              <Trash2 size={18} className="settings-group-icon" />
              <div>
                <h3 className="settings-group-title">Search History & Privacy</h3>
                <p className="settings-group-desc">
                  {searchHistoryCount} stored {searchHistoryCount === 1 ? 'query' : 'queries'} in your local profile
                </p>
              </div>
            </div>
            <button
              type="button"
              className="settings-action-btn danger-outline"
              onClick={onClearHistory}
              disabled={searchHistoryCount === 0}
            >
              <Trash2 size={15} />
              <span>{searchHistoryCount === 0 ? 'Search History Clean' : 'Clear Search History'}</span>
            </button>
          </section>

          {/* Section 6: About App */}
          <section className="settings-group about-group">
            <div className="about-app-card">
              <div className="about-app-badge">
                <Sparkles size={14} />
                <span>Seeder.play v2.4</span>
              </div>
              <p className="about-app-desc">
                High-fidelity YouTube Music Desktop & Mobile Experience with real-time synchronized karaoke lyrics, lossless routing, and responsive ambient UI.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="settings-dialog-footer">
          <button type="button" className="settings-done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
