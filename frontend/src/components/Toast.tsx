import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, Heart, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
  hasCurrentTrack?: boolean;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss, hasCurrentTrack = false }) => {
  const [activeToast, setActiveToast] = useState<ToastMessage | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const triggerDismiss = useCallback(() => {
    setIsExiting(true);
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => {
      onDismissRef.current();
      setActiveToast(null);
      setIsExiting(false);
    }, 240);
  }, []);

  // When a new toast is passed in, activate it and start a guaranteed auto-hide timer
  useEffect(() => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }

    if (toast) {
      setActiveToast(toast);
      setIsExiting(false);

      // Auto-hide in 2.2 seconds guaranteed, regardless of parent re-renders
      autoHideTimerRef.current = setTimeout(() => {
        triggerDismiss();
      }, 2200);
    } else {
      setActiveToast(null);
      setIsExiting(false);
    }

    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [toast?.id, triggerDismiss]);

  if (!activeToast) return null;

  const isLikedNotice =
    activeToast.text.toLowerCase().includes('liked') ||
    activeToast.text.toLowerCase().includes('saved');

  return (
    <div
      className={`ambient-capsule-toast toast-${activeToast.type || 'success'} ${hasCurrentTrack ? 'has-player' : ''} ${isExiting ? 'is-exiting' : ''}`}
      role="status"
      aria-live="polite"
      onClick={triggerDismiss}
    >
      <div className="capsule-inner-content">
        <div className="capsule-icon-wrap">
          {isLikedNotice ? (
            <Heart size={15} fill="#a855f7" color="#a855f7" className="capsule-heart-pulse" />
          ) : activeToast.type === 'error' ? (
            <AlertCircle size={15} color="var(--accent-rose)" />
          ) : activeToast.type === 'info' ? (
            <Info size={15} color="var(--accent-cyan)" />
          ) : (
            <CheckCircle2 size={15} color="var(--accent-primary)" />
          )}
        </div>
        <span className="capsule-message-text">{activeToast.text}</span>
        <button
          type="button"
          className="capsule-close-btn"
          onClick={(e) => {
            e.stopPropagation();
            triggerDismiss();
          }}
          aria-label="Dismiss notification"
          title="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
