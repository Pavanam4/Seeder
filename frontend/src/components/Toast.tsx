import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, Heart, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 2400);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isLikedNotice =
    toast.text.toLowerCase().includes('liked') ||
    toast.text.toLowerCase().includes('saved');

  return (
    <div
      className={`ambient-capsule-toast toast-${toast.type || 'success'}`}
      role="status"
      aria-live="polite"
      onClick={onDismiss}
    >
      <div className="capsule-icon-wrap">
        {isLikedNotice ? (
          <Heart size={15} fill="#a855f7" color="#a855f7" className="capsule-heart-pulse" />
        ) : toast.type === 'error' ? (
          <AlertCircle size={15} color="var(--accent-rose)" />
        ) : toast.type === 'info' ? (
          <Info size={15} color="var(--accent-cyan)" />
        ) : (
          <CheckCircle2 size={15} color="var(--accent-primary)" />
        )}
      </div>
      <span className="capsule-message-text">{toast.text}</span>
      <button
        type="button"
        className="capsule-dismiss-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Dismiss notification"
      >
        <X size={12} />
      </button>
    </div>
  );
};
