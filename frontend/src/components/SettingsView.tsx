import React, { useState } from 'react';
import {
  Palette,
  Sliders,
  Globe,
  Volume2,
  Check,
  ChevronLeft,
  VolumeX,
  Volume1,
  Headphones,
  CheckCircle2,
} from 'lucide-react';
import type { ThemePalette, AudioQuality, AudioNormalizationMode } from '../types';

interface SettingsViewProps {
  theme: ThemePalette;
  onThemeChange: (theme: ThemePalette) => void;
  audioQuality: AudioQuality;
  onQualityChange: (quality: AudioQuality) => void;
  musicLanguage: string;
  onLanguageChange: (lang: string) => void;
  audioNormalization: AudioNormalizationMode;
  onNormalizationChange: (mode: AudioNormalizationMode) => void;
  onGoBack: () => void;
}

type SettingsCategory = 'themes' | 'language' | 'quality' | 'normalization';

const THEMES: { id: ThemePalette; name: string; dotColor: string; desc: string; bgTone: string }[] = [
  {
    id: 'amber',
    name: 'Warm Amber',
    dotColor: '#F59E0B',
    desc: 'Golden amber glow tailored with obsidian dark styling and warm acoustics.',
    bgTone: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(18, 14, 10, 0.95))',
  },
  {
    id: 'aurora',
    name: 'Emerald Aurora',
    dotColor: '#10B981',
    desc: 'Deep boreal emerald with crisp, vivid neon contrasts and dark slate foundation.',
    bgTone: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(10, 18, 14, 0.95))',
  },
  {
    id: 'cyber',
    name: 'Cyber Violet',
    dotColor: '#8B5CF6',
    desc: 'Electric purple with futuristic dark violet gradients and high-contrast accents.',
    bgTone: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(16, 12, 24, 0.95))',
  },
];

const QUALITIES: { id: AudioQuality; label: string; desc: string; badge: string }[] = [
  {
    id: 'highres',
    label: 'Ultra High (1080p Stream)',
    desc: 'Lossless audio fidelity extracted from maximum resolution video container with highest bitrate.',
    badge: '1080p • 256kbps',
  },
  {
    id: 'hd720',
    label: 'High Quality (720p Stream)',
    desc: 'Balanced high-fidelity audio stream with rapid load time and wide dynamic range.',
    badge: '720p • 192kbps',
  },
  {
    id: 'medium',
    label: 'Standard (360p Stream)',
    desc: 'Optimized data-efficient stream ideal for metered mobile data and rapid caching.',
    badge: '360p • 128kbps',
  },
  {
    id: 'auto',
    label: 'Adaptive Dynamic (Auto)',
    desc: 'Dynamically adapts audio stream buffer based on current network bandwidth.',
    badge: 'Dynamic Bitrate',
  },
];

const LANGUAGES = [
  { id: 'all', name: 'Global Hits (All)', desc: 'Trending worldwide chart toppers across all genres' },
  { id: 'malayalam', name: 'Malayalam', desc: 'Fresh Mollywood releases, indie acoustics, and evergreen classics' },
  { id: 'tamil', name: 'Tamil', desc: 'Latest Kollywood blockbusters, Anirudh hits, and soulful melodies' },
  { id: 'hindi', name: 'Hindi', desc: 'Bollywood essentials, pop romance, and indie sensation tracks' },
  { id: 'punjabi', name: 'Punjabi', desc: 'High-energy beats, Bhangra pop, and urban Punjabi chartbusters' },
  { id: 'english', name: 'Global English', desc: 'Billboard Hot 100, viral hits, and contemporary pop anthems' },
  { id: 'synthwave', name: 'Synthwave / Retro', desc: 'Outrun synthesizers, midnight drive electro, and 80s nostalgia' },
  { id: 'lofi', name: 'Lo-Fi Chill Beats', desc: 'Mellow beats, soothing vinyl crackle, and study instrumental mixes' },
];

const NORMALIZATION_MODES: {
  id: AudioNormalizationMode;
  title: string;
  target: string;
  desc: string;
}[] = [
  {
    id: 'balanced',
    title: 'Balanced Normalization',
    target: '-14 LUFS (Standard)',
    desc: 'Calibrates audio to international streaming loudness standard. Completely eliminates volume shocks when jumping between quiet acoustic songs and loud mastered tracks.',
  },
  {
    id: 'loud',
    title: 'Dynamic Club Normalization',
    target: '-10 LUFS (Punchy)',
    desc: 'Boosts quieter audio tracks while transparently compressing dynamic peaks for loud, consistent headphone output.',
  },
  {
    id: 'soft',
    title: 'Night Mode & Soft Acoustic',
    target: '-20 LUFS (Gentle)',
    desc: 'Levels sound to a smooth, relaxed volume ceiling ideal for late-night listening and sensitive headphones.',
  },
  {
    id: 'off',
    title: 'Normalization Disabled',
    target: 'Raw Source Volume',
    desc: 'Plays original unprocessed YouTube audio levels directly with zero calibration applied.',
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onThemeChange,
  audioQuality,
  onQualityChange,
  musicLanguage,
  onLanguageChange,
  audioNormalization,
  onNormalizationChange,
  onGoBack,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsCategory>('themes');

  return (
    <div className="settings-page-container">
      {/* Page Header with Back Navigation */}
      <div className="settings-page-header">
        <button
          type="button"
          className="settings-back-btn"
          onClick={onGoBack}
          aria-label="Back to previous view"
          title="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="settings-header-text">
          <h1 className="settings-page-title">Settings & Audio Configuration</h1>
          <p className="settings-page-subtitle">
            Fine-tune audio processing, streaming fidelity, regional curation, and theme accents
          </p>
        </div>
      </div>

      {/* Main Settings Body */}
      <div className="settings-page-body">
        {/* Category Navigation Bar / Sidebar */}
        <aside className="settings-nav-sidebar" aria-label="Settings Categories">
          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'themes' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('themes')}
          >
            <Palette size={18} className="settings-tab-icon" />
            <span className="settings-tab-label">Theme & Appearance</span>
          </button>

          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'language' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('language')}
          >
            <Globe size={18} className="settings-tab-icon" />
            <span className="settings-tab-label">Language & Region</span>
          </button>

          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'quality' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('quality')}
          >
            <Sliders size={18} className="settings-tab-icon" />
            <span className="settings-tab-label">Streaming Quality</span>
          </button>

          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'normalization' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('normalization')}
          >
            <Volume2 size={18} className="settings-tab-icon" />
            <span className="settings-tab-label">Audio Normalization</span>
          </button>
        </aside>

        {/* Category Content Area */}
        <main className="settings-content-panel">
          {/* TAB 1: THEMES */}
          {activeTab === 'themes' && (
            <div className="settings-category-view">
              <div className="category-view-header">
                <h2 className="category-title">Theme Palette</h2>
                <p className="category-desc">
                  Select your interface color accent. Changes are applied instantly across player controls, ambient glow, and navigation bars.
                </p>
              </div>

              <div className="settings-theme-cards-grid">
                {THEMES.map((t) => {
                  const isSelected = theme === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`settings-theme-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => onThemeChange(t.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="theme-card-preview" style={{ background: t.bgTone }}>
                        <span className="theme-color-dot" style={{ backgroundColor: t.dotColor }} />
                        <span className="theme-preview-pill" style={{ color: t.dotColor, borderColor: t.dotColor }}>
                          {t.name}
                        </span>
                      </div>
                      <div className="theme-card-info">
                        <div className="theme-title-row">
                          <span className="theme-name">{t.name}</span>
                          {isSelected && (
                            <div className="selection-badge">
                              <Check size={14} />
                            </div>
                          )}
                        </div>
                        <p className="theme-desc">{t.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: LANGUAGE & REGION */}
          {activeTab === 'language' && (
            <div className="settings-category-view">
              <div className="category-view-header">
                <h2 className="category-title">Regional Music & Language Curation</h2>
                <p className="category-desc">
                  Configure your primary music discovery language. This personalizes trending hits, home suggestions, and algorithmic playlists.
                </p>
              </div>

              <div className="settings-language-cards-grid">
                {LANGUAGES.map((lang) => {
                  const isSelected = musicLanguage === lang.id;
                  return (
                    <div
                      key={lang.id}
                      className={`settings-lang-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => onLanguageChange(lang.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="lang-card-main">
                        <div>
                          <span className="lang-card-name">{lang.name}</span>
                          <p className="lang-card-desc">{lang.desc}</p>
                        </div>
                        {isSelected && (
                          <div className="selection-badge">
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: STREAMING AUDIO QUALITY */}
          {activeTab === 'quality' && (
            <div className="settings-category-view">
              <div className="category-view-header">
                <h2 className="category-title">Streaming Audio Quality</h2>
                <p className="category-desc">
                  Select direct stream bitrate fidelity. The player extracts high-bitrate AAC/Opus audio streams directly from YouTube backend infrastructure.
                </p>
              </div>

              <div className="settings-quality-cards-list">
                {QUALITIES.map((q) => {
                  const isSelected = audioQuality === q.id;
                  return (
                    <div
                      key={q.id}
                      className={`settings-quality-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => onQualityChange(q.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="quality-card-icon-wrap">
                        <Headphones size={20} className="quality-card-icon" />
                      </div>
                      <div className="quality-card-meta">
                        <div className="quality-title-row">
                          <span className="quality-label">{q.label}</span>
                          <span className="quality-badge">{q.badge}</span>
                        </div>
                        <p className="quality-desc">{q.desc}</p>
                      </div>
                      {isSelected && (
                        <div className="selection-badge">
                          <Check size={14} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: WORKING AUDIO NORMALIZATION */}
          {activeTab === 'normalization' && (
            <div className="settings-category-view">
              <div className="category-view-header">
                <h2 className="category-title">Audio Normalization (Loudness Leveling)</h2>
                <p className="category-desc">
                  Real-time dynamic loudness equalization. Automatically evens out volume across different video uploads so you never have to constantly turn the volume knob up and down.
                </p>
              </div>

              {/* Working Engine Status Banner */}
              <div className="normalization-status-banner">
                <div className="status-banner-left">
                  <CheckCircle2 size={22} className="status-banner-icon" />
                  <div>
                    <h3 className="status-banner-title">
                      {audioNormalization === 'off' ? 'Normalization Inactive' : 'Active Loudness Calibration'}
                    </h3>
                    <p className="status-banner-desc">
                      {audioNormalization === 'off'
                        ? 'Raw video levels are played without adjustment.'
                        : 'Real-time dynamic gain leveling is maintaining steady volume across all stream transitions.'}
                    </p>
                  </div>
                </div>
                <span className={`status-pill ${audioNormalization !== 'off' ? 'is-active' : ''}`}>
                  {audioNormalization.toUpperCase()}
                </span>
              </div>

              {/* Normalization Mode Selection */}
              <div className="settings-norm-cards-list">
                {NORMALIZATION_MODES.map((mode) => {
                  const isSelected = audioNormalization === mode.id;
                  return (
                    <div
                      key={mode.id}
                      className={`settings-norm-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => onNormalizationChange(mode.id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="norm-card-header">
                        <div className="norm-card-title-group">
                          <span className="norm-title">{mode.title}</span>
                          <span className="norm-target">{mode.target}</span>
                        </div>
                        {isSelected && (
                          <div className="selection-badge">
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                      <p className="norm-desc">{mode.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
