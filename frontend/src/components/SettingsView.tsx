import React, { useState } from 'react';
import {
  Palette,
  Sliders,
  Globe,
  Volume2,
  Check,
  ChevronLeft,
  User,
  LogIn,
  LogOut,
  Smartphone,
  Mail,
  Copy,
  ArrowRight,
  Headphones,
  CheckCircle2,
} from 'lucide-react';
import type { ThemePalette, AudioQuality, AudioNormalizationMode, UserProfile } from '../types';

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
  currentUser?: UserProfile | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  likedTracksCount?: number;
  playlistsCount?: number;
}

type SettingsCategory = 'account' | 'themes' | 'language' | 'quality' | 'normalization';

const THEMES: { id: ThemePalette; name: string; dotColor: string; desc: string; bgTone: string }[] = [
  {
    id: 'noir',
    name: 'Midnight Pure Black (OLED)',
    dotColor: '#ffffff',
    desc: 'Deep pitch-black aesthetic with frosted acrylic blur, razor contrast, and platinum accents.',
    bgTone: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.98))',
  },
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
  { id: 'telugu', name: 'Telugu', desc: 'Tollywood blockbusters, melodic soundtracks, and mass anthems' },
  { id: 'punjabi', name: 'Punjabi', desc: 'High-energy beats, Bhangra pop, and urban Punjabi chartbusters' },
  { id: 'kannada', name: 'Kannada', desc: 'Sandalwood chartbusters, soulful melodies, and new age indie' },
  { id: 'bengali', name: 'Bengali', desc: 'Timeless melodies, Rabindra Sangeet, and modern Bangla pop' },
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
  currentUser,
  onOpenAuthModal,
  onLogout,
  likedTracksCount = 0,
  playlistsCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsCategory>('account');
  const [copiedUid, setCopiedUid] = useState(false);

  const handleCopyUid = () => {
    if (!currentUser?.id) return;
    navigator.clipboard.writeText(currentUser.id);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

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
          <ChevronLeft size={20} />
        </button>
        <div className="settings-header-text">
          <div className="settings-header-title-row">
            <h1 className="settings-page-title">Settings &amp; Preferences</h1>
          </div>
          <p className="settings-page-subtitle">
            Manage your account authentication, cloud playback synchronization, streaming fidelity, and acoustics
          </p>
        </div>
      </div>

      {/* Main Settings Body */}
      <div className="settings-page-body">
        {/* Category Navigation Bar / Sidebar */}
        <aside className="settings-nav-sidebar" aria-label="Settings Categories">
          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'account' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <User size={17} className="settings-tab-icon" />
            <span className="settings-tab-label">Account &amp; Security</span>
          </button>

          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'themes' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('themes')}
          >
            <Palette size={17} className="settings-tab-icon" />
            <span className="settings-tab-label">Theme &amp; Appearance</span>
            <span
              className="settings-theme-preview-dot"
              style={{
                backgroundColor:
                  theme === 'amber'
                    ? '#f59e0b'
                    : theme === 'aurora'
                    ? '#10b981'
                    : theme === 'cyber'
                    ? '#8b5cf6'
                    : '#ffffff',
              }}
            />
          </button>

          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'language' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('language')}
          >
            <Globe size={17} className="settings-tab-icon" />
            <span className="settings-tab-label">Language &amp; Region</span>
          </button>

          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'quality' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('quality')}
          >
            <Sliders size={17} className="settings-tab-icon" />
            <span className="settings-tab-label">Streaming Quality</span>
          </button>

          <button
            type="button"
            className={`settings-nav-tab ${activeTab === 'normalization' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('normalization')}
          >
            <Volume2 size={17} className="settings-tab-icon" />
            <span className="settings-tab-label">Audio Normalization</span>
          </button>
        </aside>

        {/* Category Content Area */}
        <main className="settings-content-panel">
          {/* ========================================================================= */}
          {/* TAB 0: ACCOUNT & AUTHENTICATION (PROFESSIONAL PROFILE & CLOUD ENGINE) */}
          {/* ========================================================================= */}
          {activeTab === 'account' && (
            <div className="pro-settings-account-view">
              {/* Profile Hero Card */}
              {currentUser ? (
                <div className="pro-profile-hero-card">
                  <div className="pro-hero-ambient-glow" />

                  <div className="pro-hero-content">
                    {/* Avatar with Status Ring */}
                    <div className="pro-hero-avatar-box">
                      {currentUser.photoUrl ? (
                        <img
                          src={currentUser.photoUrl}
                          alt={currentUser.displayName}
                          className="pro-hero-avatar-img"
                        />
                      ) : (
                        <div className="pro-hero-avatar-placeholder">
                          {currentUser.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* User Details */}
                    <div className="pro-hero-details">
                      <h2 className="pro-hero-name">{currentUser.displayName}</h2>

                      <div className="pro-hero-meta-row">
                        {currentUser.email && (
                          <div className="pro-hero-meta-item">
                            <Mail size={13} className="text-zinc-400" />
                            <span>{currentUser.email}</span>
                          </div>
                        )}
                        {currentUser.username && (
                          <div className="pro-hero-meta-item">
                            <span>@{currentUser.username}</span>
                          </div>
                        )}
                        {currentUser.phoneNumber && (
                          <div className="pro-hero-meta-item">
                            <Smartphone size={13} className="text-zinc-400" />
                            <span>{currentUser.phoneNumber}</span>
                          </div>
                        )}

                        {/* Masked UID with 1-Click Copy */}
                        <button
                          type="button"
                          className="pro-hero-uid-pill"
                          onClick={handleCopyUid}
                          title="Click to copy full User ID"
                        >
                          <span className="pro-uid-label">UID:</span>
                          <span className="pro-uid-val">
                            {currentUser.id.length > 12
                              ? `${currentUser.id.slice(0, 6)}...${currentUser.id.slice(-4)}`
                              : currentUser.id}
                          </span>
                          {copiedUid ? (
                            <Check size={12} className="text-zinc-200" />
                          ) : (
                            <Copy size={12} className="text-zinc-400" />
                          )}
                          {copiedUid && <span className="pro-copied-tooltip">Copied!</span>}
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pro-hero-actions">
                      <button
                        type="button"
                        className="pro-btn-danger"
                        onClick={onLogout}
                        title="Sign Out of Seeder"
                      >
                        <LogOut size={13} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Guest Mode Welcome Card */
                <div className="pro-guest-hero-card">
                  <div className="pro-guest-ambient-glow" />
                  <div className="pro-guest-content">
                    <div className="pro-guest-icon-box">
                      <User size={30} className="text-emerald-400" />
                    </div>
                    <div className="pro-guest-info">
                      <div className="pro-guest-tag">GUEST MODE ACTIVE</div>
                      <h2 className="pro-guest-title">Connect your account for continuous cloud flow</h2>
                      <p className="pro-guest-subtitle">
                        Sign in with Google, X, or GitHub to keep your Liked Songs, custom playlists, and playback position synced 24/7 across all devices.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="pro-guest-cta-btn"
                      onClick={onOpenAuthModal}
                    >
                      <LogIn size={15} />
                      <span>Sign In / Connect</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Section 2: Connected Authentication & Identities */}
              <div className="pro-settings-card">
                <div className="pro-card-header">
                  <div>
                    <h3 className="pro-card-title">Authentication &amp; Identity Hub</h3>
                    <p className="pro-card-subtitle">
                      Connected provider accounts and multi-device identity credentials
                    </p>
                  </div>
                </div>

                <div className="pro-providers-list">
                  {/* Google Identity Item */}
                  <div className={`pro-provider-row ${currentUser?.provider === 'google' ? 'is-active' : ''}`}>
                    <div className="pro-provider-left">
                      <div className="pro-provider-logo-box google">
                        <svg width="18" height="18" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                      </div>
                      <div>
                        <div className="pro-provider-title-row">
                          <span className="pro-provider-name">Google Account</span>
                          {currentUser?.provider === 'google' && (
                            <span className="pro-active-chip">Active Session</span>
                          )}
                        </div>
                        <p className="pro-provider-detail">
                          {currentUser?.provider === 'google'
                            ? `Connected as ${currentUser.email || currentUser.displayName}`
                            : 'Connect with your Google profile'}
                        </p>
                      </div>
                    </div>
                    <div className="pro-provider-right">
                      {currentUser?.provider === 'google' ? (
                        <span className="pro-connected-status">
                          <Check size={14} className="text-zinc-300" />
                          <span>Connected</span>
                        </span>
                      ) : (
                        <button type="button" className="pro-link-btn" onClick={onOpenAuthModal}>
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                <h2 className="category-title">Regional Music &amp; Language Curation</h2>
                <p className="category-desc">
                  Configure your primary music discovery language. This personalizes trending hits, home suggestions, and personalized playlists.
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
