import React from 'react';
import { Music, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  backendHealthy: boolean | null;
  frameworkInfo?: string;
}

export const Header: React.FC<HeaderProps> = ({ backendHealthy, frameworkInfo }) => {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-icon-wrapper">
          <Music size={24} color="#ffffff" />
        </div>
        <div className="brand-titles">
          <h1>
            Music Fetcher
            <span className="brand-tag">Technical POC</span>
          </h1>
          <p className="brand-subtitle">
            YouTube Music Search &amp; Playback Feasibility Evaluation
          </p>
        </div>
      </div>

      <div className="header-status-badge">
        <span className={`status-dot ${backendHealthy === false ? 'error' : ''}`} />
        <span>
          {backendHealthy === null
            ? 'Connecting to backend...'
            : backendHealthy
            ? `Backend Active (${frameworkInfo || '.NET 8'})`
            : 'Backend Disconnected'}
        </span>
        {backendHealthy ? (
          <CheckCircle2 size={15} color="#22c55e" />
        ) : (
          <AlertCircle size={15} color="#f43f5e" />
        )}
      </div>
    </header>
  );
};
