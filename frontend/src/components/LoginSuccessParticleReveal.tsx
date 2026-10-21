import React, { useEffect, useRef, useState } from 'react';
import type { UserProfile } from '../types';
import { CheckCircle2, Sparkles, Radio } from 'lucide-react';

interface LoginSuccessParticleRevealProps {
  user: UserProfile;
  onAnimationComplete: () => void;
}

interface PixelParticle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  targetAlpha: number;
  speed: number;
  delay: number;
  layer: 'foreground' | 'background' | 'glow';
}

export const LoginSuccessParticleReveal: React.FC<LoginSuccessParticleRevealProps> = ({
  user,
  onAnimationComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'converging' | 'locked' | 'exploding'>('converging');
  const [showCard, setShowCard] = useState(false);
  const [dissolve, setDissolve] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let startTime = performance.now();
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const centerX = width / 2;
    const centerY = height / 2;

    // Build target shape: Soundwave Equalizer + Play Triangle + Surrounding Pixel Matrix
    const targetPoints: { x: number; y: number; color: string; size: number }[] = [];

    // 1. Center Soundwave Equalizer Bars (Black, White, Monochrome Silver)
    const barCount = 17;
    const barWidth = 6;
    const barGap = 12;
    const totalEqualizerWidth = barCount * (barWidth + barGap);
    const startX = centerX - totalEqualizerWidth / 2;

    for (let b = 0; b < barCount; b++) {
      const bx = startX + b * (barWidth + barGap);
      // Normalized wave height pattern
      const distFromCenter = Math.abs(b - barCount / 2) / (barCount / 2);
      const barHeight = Math.max(16, 90 * (1 - distFromCenter * 0.7) + (b % 2 === 0 ? 20 : -10));

      for (let y = -barHeight / 2; y <= barHeight / 2; y += 7) {
        const isWhite = Math.random() > 0.3;
        targetPoints.push({
          x: bx,
          y: centerY + y,
          color: isWhite ? '#ffffff' : Math.random() > 0.5 ? '#e2e8f0' : '#94a3b8',
          size: Math.random() > 0.4 ? 4 : 3,
        });
      }
    }

    // 2. Center Concentric Sonic Pixel Rings
    const ringRadii = [80, 130, 180, 240];
    ringRadii.forEach((radius, rIdx) => {
      const pointsInRing = 24 + rIdx * 18;
      for (let i = 0; i < pointsInRing; i++) {
        const angle = (i / pointsInRing) * Math.PI * 2;
        const rx = centerX + Math.cos(angle) * radius;
        const ry = centerY + Math.sin(angle) * (radius * 0.65); // Elliptical perspective
        const isBright = Math.random() > 0.5;
        targetPoints.push({
          x: rx,
          y: ry,
          color: isBright ? '#ffffff' : '#a1a1aa',
          size: Math.random() > 0.6 ? 3 : 2,
        });
      }
    });

    // 3. Iconic PlayMusic Triangle In Center
    const playPoints = 35;
    for (let p = 0; p < playPoints; p++) {
      const s = p / playPoints;
      // Triangle vertices
      const px = centerX - 25 + s * 45;
      const pyTop = centerY - 35 + s * 35;
      const pyBot = centerY + 35 - s * 35;
      targetPoints.push({
        x: px,
        y: pyTop,
        color: '#ffffff',
        size: 3.5,
      });
      targetPoints.push({
        x: px,
        y: pyBot,
        color: '#ffffff',
        size: 3.5,
      });
    }

    // 4. Ambient Sparkle Pixels (Stars in the void)
    for (let i = 0; i < 200; i++) {
      targetPoints.push({
        x: centerX + (Math.random() - 0.5) * width * 0.9,
        y: centerY + (Math.random() - 0.5) * height * 0.9,
        color: Math.random() > 0.7 ? '#ffffff' : '#71717a',
        size: Math.random() > 0.5 ? 2 : 1.5,
      });
    }

    // Initialize Particles from random perimeter locations
    const particles: PixelParticle[] = targetPoints.map((tp, idx) => {
      // Spawn from off-screen or far edges
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = Math.max(width, height) * (0.6 + Math.random() * 0.7);
      const originX = centerX + Math.cos(angle) * spawnDist;
      const originY = centerY + Math.sin(angle) * spawnDist;

      return {
        x: originX,
        y: originY,
        originX,
        originY,
        targetX: tp.x,
        targetY: tp.y,
        vx: 0,
        vy: 0,
        size: tp.size,
        color: tp.color,
        alpha: 0,
        targetAlpha: 0.85 + Math.random() * 0.15,
        speed: 0.055 + Math.random() * 0.045,
        delay: (idx / targetPoints.length) * 0.28,
        layer: Math.random() > 0.7 ? 'glow' : 'foreground',
      };
    });

    // Phase management timers
    const cardTimer = setTimeout(() => {
      setShowCard(true);
      setPhase('locked');
    }, 850);

    const explodeTimer = setTimeout(() => {
      setPhase('exploding');
      setDissolve(true);
    }, 1800);

    const finishTimer = setTimeout(() => {
      onAnimationComplete();
    }, 2400);

    // Animation Loop
    const render = (currentTime: number) => {
      const elapsed = (currentTime - startTime) / 1000; // in seconds

      ctx.clearRect(0, 0, width, height);

      // Deep cinematic ambient backdrop
      ctx.fillStyle = 'rgba(5, 5, 8, 0.35)';
      ctx.fillRect(0, 0, width, height);

      // Render each pixel particle
      particles.forEach((p) => {
        if (elapsed < p.delay) return;

        if (phase === 'converging') {
          // Gravitate & assemble towards target formation
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          p.x += dx * p.speed;
          p.y += dy * p.speed;
          p.alpha = Math.min(p.targetAlpha, p.alpha + 0.08);
        } else if (phase === 'locked') {
          // Subtle harmonic vibration & breathing equalizer oscillation
          const harmonic = Math.sin(elapsed * 6 + p.targetX * 0.05) * 2.5;
          p.x = p.targetX + (Math.random() - 0.5) * 0.8;
          p.y = p.targetY + harmonic;
          p.alpha = p.targetAlpha;
        } else if (phase === 'exploding') {
          // Detonate outward in pixel shockwave towards the viewer
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const dist = Math.hypot(dx, dy) || 1;
          const nx = dx / dist;
          const ny = dy / dist;

          p.vx += nx * 1.8;
          p.vy += ny * 1.8;
          p.x += p.vx;
          p.y += p.vy;
          p.size = Math.min(12, p.size * 1.04);
          p.alpha = Math.max(0, p.alpha - 0.035);
        }

        // Draw Square Pixel
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        // Subtle glow for white highlight pixels
        if (p.layer === 'glow' && (p.color === '#ffffff' || p.color === '#e2e8f0')) {
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 8;
        }

        // Render crisp sharp pixel square
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.restore();
      });

      // Digital Scanline / CRT overlay line moving down
      const scanlineY = ((elapsed * 320) % height);
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(0, scanlineY, width, 2);
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      clearTimeout(cardTimer);
      clearTimeout(explodeTimer);
      clearTimeout(finishTimer);
    };
  }, [onAnimationComplete, phase]);

  const providerLabel =
    user.provider === 'github'
      ? 'GitHub Verified'
      : user.provider === 'google'
      ? 'Google Verified'
      : user.provider === 'twitter'
      ? 'X (Twitter)'
      : 'Listener';

  return (
    <div
      className={`login-reveal-overlay ${dissolve ? 'dissolve-out' : ''}`}
      onClick={onAnimationComplete}
      title="Click to skip animation"
      role="alert"
      aria-live="polite"
    >
      {/* 60FPS High-Density Pixel Particle Canvas */}
      <canvas ref={canvasRef} className="login-reveal-canvas" />

      {/* Central Holographic Success Badge */}
      <div className={`login-reveal-content ${showCard ? 'visible' : ''}`}>
        {/* Glow Halo */}
        <div className="login-reveal-glow" />

        {/* User Profile Emblem */}
        <div className="login-reveal-avatar-container">
          <img
            src={user.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName)}`}
            alt={user.displayName}
            className="login-reveal-avatar"
          />
          <div className="login-reveal-badge">
            <CheckCircle2 size={18} className="text-emerald-400" />
          </div>
        </div>

        {/* Identity & Status */}
        <div className="login-reveal-meta">
          <div className="login-reveal-tag">
            <Radio size={12} className="animate-pulse text-emerald-400" />
            <span>AUTHENTICATED</span>
          </div>

          <h2 className="login-reveal-name">{user.displayName}</h2>
          {user.username && <p className="login-reveal-handle">{user.username}</p>}

          <div className="login-reveal-status-pill">
            <Sparkles size={13} className="text-cyan-400" />
            <span>{providerLabel} • Playback Active</span>
          </div>
        </div>

        {/* Pixel Assembly Status Text */}
        <div className="login-reveal-loading-text">
          <span>INITIALIZING MUSIC INTERFACE...</span>
        </div>
      </div>

      {/* Subtle Skip Hint */}
      <div className="login-reveal-skip-hint">Click anywhere to skip</div>
    </div>
  );
};
