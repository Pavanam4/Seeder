import React from 'react';
import type { SearchDiagnostics, YTPlayerStateName, PlayerErrorInfo } from '../types';
import { Activity, Clock, Layers, ShieldCheck, PlayCircle, AlertTriangle, X } from 'lucide-react';

interface DiagnosticsHUDProps {
  diagnostics: SearchDiagnostics;
  playerState: YTPlayerStateName;
  playerError: PlayerErrorInfo | null;
  selectedTrackId?: string;
  isEmbeddableCandidate?: boolean;
  onClose?: () => void;
}

export const DiagnosticsHUD: React.FC<DiagnosticsHUDProps> = ({
  diagnostics,
  playerState,
  playerError,
  selectedTrackId,
  isEmbeddableCandidate,
  onClose,
}) => {
  return (
    <div className="diagnostics-hud-banner" aria-label="Test Diagnostics HUD">
      <div className="diag-header-row">
        <div className="diag-title-left">
          <Activity size={15} color="var(--accent-primary)" />
          <span className="diag-main-title">Realtime System Diagnostics</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="diag-close-btn"
            onClick={onClose}
            aria-label="Close Diagnostics"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="diag-items-grid">
        <div className="diag-item">
          <span className="diag-label">Search Provider</span>
          <span className="diag-value">{diagnostics.provider || 'ytmusicapi'}</span>
        </div>

        <div className="diag-item">
          <span className="diag-label">Search Latency</span>
          <span className="diag-value">
            <Clock size={12} color="#f59e0b" style={{ display: 'inline', marginRight: 4 }} />
            {diagnostics.durationMs > 0 ? `${diagnostics.durationMs} ms` : '—'}
          </span>
        </div>

        <div className="diag-item">
          <span className="diag-label">Results Returned</span>
          <span className="diag-value">
            <Layers size={12} color="#a855f7" style={{ display: 'inline', marginRight: 4 }} />
            {diagnostics.totalReturned} items
          </span>
        </div>

        <div className="diag-item">
          <span className="diag-label">HTTP Status</span>
          <span className="diag-value">
            {diagnostics.httpStatus ? (
              <span
                className={`diag-badge ${
                  diagnostics.httpStatus === 200
                    ? 'success'
                    : diagnostics.httpStatus < 500
                    ? 'warning'
                    : 'danger'
                }`}
              >
                {diagnostics.httpStatus} {diagnostics.httpStatus === 200 ? 'OK' : 'Error'}
              </span>
            ) : (
              '—'
            )}
          </span>
        </div>

        <div className="diag-item">
          <span className="diag-label">Embed Status</span>
          <span className="diag-value">
            {selectedTrackId ? (
              playerError?.isEmbedRestricted ? (
                <span className="diag-badge danger">Restricted (Err {playerError.code})</span>
              ) : isEmbeddableCandidate ? (
                <span className="diag-badge success">
                  <ShieldCheck size={11} style={{ display: 'inline', marginRight: 3 }} />
                  Candidate
                </span>
              ) : (
                <span className="diag-badge warning">External</span>
              )
            ) : (
              'Idle'
            )}
          </span>
        </div>

        <div className="diag-item">
          <span className="diag-label">Playback State</span>
          <span className="diag-value">
            {playerError ? (
              <span className="diag-badge danger">
                <AlertTriangle size={11} style={{ display: 'inline', marginRight: 3 }} />
                Err {playerError.code}
              </span>
            ) : (
              <span
                className={`diag-badge ${
                  playerState === 'PLAYING'
                    ? 'success'
                    : playerState === 'BUFFERING'
                    ? 'warning'
                    : 'info'
                }`}
              >
                <PlayCircle size={11} style={{ display: 'inline', marginRight: 3 }} />
                {playerState}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
