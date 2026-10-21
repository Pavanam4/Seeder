/**
 * Mobile Background Audio & Session Keep-Alive Service
 *
 * Guarantees continuous background playback on mobile browsers (iOS Safari, Android Chrome/Edge/Firefox)
 * when the screen is locked, the browser is minimized, or the user switches tabs/apps.
 *
 * Technical Implementation:
 * 1. AudioSession API: declares navigator.audioSession.type = 'playback' (iOS 15+)
 * 2. Silent Audio Anchor: Looping 3-second PCM WAV element unlocked on first touch/pointer gesture
 * 3. Screen WakeLock API: Prevents device sleep while audio is actively playing
 * 4. Visibility Change Watcher: Rapidly intercepts browser suspension and restores playback pipeline
 */

function generateSilentWavDataUri(durationSeconds = 3): string {
  const sampleRate = 8000;
  const numSamples = sampleRate * durationSeconds;
  const buffer = new Uint8Array(44 + numSamples);
  const view = new DataView(buffer.buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples, true); // size
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " chunk
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true); // length = 16
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono (1 channel)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true); // Block align
  view.setUint16(34, 8, true); // 8 bits per sample

  // "data" chunk
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, numSamples, true);

  // 8-bit PCM silence center value is 128 (0x80)
  for (let i = 0; i < numSamples; i++) {
    buffer[44 + i] = 128;
  }

  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

class MobileBackgroundPlayService {
  private silentAudio: HTMLAudioElement | null = null;
  private wakeLock: any = null;
  private isUnlocked = false;
  private isKeepingAlive = false;
  private onResumeHandler: (() => void) | null = null;

  constructor() {
    if (typeof window === 'undefined') return;

    this.initAudioSession();
    this.registerGestureUnlock();
    this.registerVisibilityWatchers();
  }

  /**
   * Configure iOS AudioSession for persistent playback
   */
  private initAudioSession() {
    try {
      if ('audioSession' in navigator) {
        (navigator as any).audioSession.type = 'playback';
      }
    } catch {
      // AudioSession not supported on this platform
    }
  }

  /**
   * Pre-unlock the HTMLAudioElement on the very first user interaction
   * so mobile Safari and Chrome allow background execution without gesture re-verification
   */
  private registerGestureUnlock() {
    const unlockGesture = () => {
      if (this.isUnlocked) return;

      try {
        if (!this.silentAudio) {
          const audio = new Audio(generateSilentWavDataUri(3));
          audio.loop = true;
          audio.volume = 0.02; // Inaudible level but > 0 so OS audio pipeline remains active
          this.silentAudio = audio;
        }

        const promise = this.silentAudio.play();
        if (promise !== undefined) {
          promise
            .then(() => {
              this.isUnlocked = true;
              if (!this.isKeepingAlive) {
                this.silentAudio?.pause();
              }
              this.cleanupGestureListeners(unlockGesture);
            })
            .catch(() => {
              // Gesture might need another direct tap
            });
        }
      } catch {
        // Ignore gesture unlock errors
      }
    };

    window.addEventListener('touchstart', unlockGesture, { passive: true });
    window.addEventListener('pointerdown', unlockGesture, { passive: true });
    window.addEventListener('click', unlockGesture, { passive: true });
    window.addEventListener('keydown', unlockGesture, { passive: true });
  }

  private cleanupGestureListeners(fn: () => void) {
    window.removeEventListener('touchstart', fn);
    window.removeEventListener('pointerdown', fn);
    window.removeEventListener('click', fn);
    window.removeEventListener('keydown', fn);
  }

  /**
   * Monitor tab visibility and screen locks to aggressively maintain audio privilege
   */
  private registerVisibilityWatchers() {
    const handleVisibility = () => {
      if (!this.isKeepingAlive) return;

      if (document.hidden) {
        // Tab backgrounded or screen locked
        this.triggerKeepAliveLoop();
      } else {
        // Tab returned to foreground
        this.requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handleVisibility);
    window.addEventListener('blur', handleVisibility);
    window.addEventListener('focus', handleVisibility);
  }

  private triggerKeepAliveLoop() {
    if (!this.isKeepingAlive) return;

    // Ensure audio element is continuously playing
    try {
      if (this.silentAudio && this.silentAudio.paused) {
        this.silentAudio.play().catch(() => {});
      }
    } catch {}

    // Maintain mediaSession playback state
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'playing';
      } catch {}
    }

    // Attempt video/audio engine resumption
    if (this.onResumeHandler) {
      const resume = this.onResumeHandler;
      resume();
      setTimeout(resume, 100);
      setTimeout(resume, 350);
      setTimeout(resume, 800);
      setTimeout(resume, 1600);
    }
  }

  /**
   * Request Screen Wake Lock so screen doesn't unexpectedly dim or sleep while active
   */
  private async requestWakeLock() {
    if (!('wakeLock' in navigator) || document.hidden || !this.isKeepingAlive) return;
    try {
      if (!this.wakeLock) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      }
    } catch {
      // Wake lock request failed or denied
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {}
      this.wakeLock = null;
    }
  }

  /**
   * Activate continuous keep-alive when playback starts
   */
  public startKeepAlive(onResume?: () => void) {
    this.isKeepingAlive = true;
    if (onResume) {
      this.onResumeHandler = onResume;
    }

    this.initAudioSession();

    if (!this.silentAudio) {
      const audio = new Audio(generateSilentWavDataUri(3));
      audio.loop = true;
      audio.volume = 0.02;
      this.silentAudio = audio;
    }

    this.silentAudio
      .play()
      .then(() => {
        this.isUnlocked = true;
      })
      .catch(() => {
        // Will retry on next user tap
      });

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'playing';
      } catch {}
    }

    this.requestWakeLock();
  }

  /**
   * Deactivate keep-alive when user pauses playback
   */
  public stopKeepAlive() {
    this.isKeepingAlive = false;
    if (this.silentAudio) {
      try {
        this.silentAudio.pause();
      } catch {}
    }

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'paused';
      } catch {}
    }

    this.releaseWakeLock();
  }
}

export const mobileBackgroundPlay = new MobileBackgroundPlayService();
