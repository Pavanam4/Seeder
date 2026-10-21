import React, { useState, useEffect, useRef } from 'react';

interface FloatingSparkle {
  id: number;
  x: number;
  y: number;
  symbol: string;
  rotation: number;
}

export const AnimatedDoodlePanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sparkles, setSparkles] = useState<FloatingSparkle[]>([]);

  // Spawn playful interactive musical notes when the user moves their mouse over the doodle panel
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Only spawn occasionally to keep it delightful and performant
    if (Math.random() < 0.22) {
      const symbols = ['♪', '♫', '♬', '𝄞', '★', '♥', '✦'];
      const newSparkle: FloatingSparkle = {
        id: Date.now() + Math.random(),
        x,
        y,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        rotation: (Math.random() - 0.5) * 40,
      };

      setSparkles((prev) => [...prev.slice(-12), newSparkle]);
    }
  };

  useEffect(() => {
    if (sparkles.length === 0) return;
    const timer = setTimeout(() => {
      setSparkles((prev) => prev.slice(1));
    }, 1200);
    return () => clearTimeout(timer);
  }, [sparkles]);

  return (
    <div
      ref={containerRef}
      className="doodle-panel-container"
      onMouseMove={handleMouseMove}
      aria-label="Animated Hand-drawn Music Doodle Pattern"
    >
      {/* SVG Filters for Authentic Hand-drawn Cartoon Squigglevision / Line-Boil */}
      <svg className="doodle-svg-filters" aria-hidden="true">
        <defs>
          <filter id="doodle-boil-1" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="doodle-boil-2" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="42" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="doodle-boil-3" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.042" numOctaves="2" seed="89" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Base Doodle Artwork with Line-Boil / Squigglevision */}
      <div className="doodle-base-layer">
        <img
          src="/music-doodle-pattern.jpg"
          alt="Black and White Musical Doodle Pattern with Piano Keys, Hypnotic Spirals, and Notes"
          className="doodle-base-image"
        />
      </div>

      {/* Layered Animated Wiggling & Rotating Doodle Elements */}
      <div className="doodle-animated-overlay">
        {/* Hypnotic Concentric Spiral 1 (Top Left) - Slow Clockwise Spin */}
        <div className="doodle-sticker doodle-spiral-pos-1">
          <svg viewBox="0 0 100 100" className="doodle-svg-spiral spin-clockwise">
            <circle cx="50" cy="50" r="46" fill="#000" stroke="#000" strokeWidth="2" />
            <circle cx="50" cy="50" r="39" fill="#fff" stroke="#000" strokeWidth="2" />
            <circle cx="50" cy="50" r="32" fill="#000" stroke="#000" strokeWidth="2" />
            <circle cx="50" cy="50" r="25" fill="#fff" stroke="#000" strokeWidth="2" />
            <circle cx="50" cy="50" r="18" fill="#000" stroke="#000" strokeWidth="2" />
            <circle cx="50" cy="50" r="11" fill="#fff" stroke="#000" strokeWidth="2" />
            <circle cx="50" cy="50" r="5" fill="#000" />
          </svg>
        </div>

        {/* Hypnotic Concentric Spiral 2 (Center Right) - Counter-Clockwise Spin */}
        <div className="doodle-sticker doodle-spiral-pos-2">
          <svg viewBox="0 0 100 100" className="doodle-svg-spiral spin-counter">
            <circle cx="50" cy="50" r="46" fill="#000" stroke="#000" strokeWidth="2" />
            <circle cx="50" cy="50" r="38" fill="#fff" stroke="#000" strokeWidth="2" />
            <circle cx="50" cy="50" r="30" fill="#000" stroke="#000" strokeWidth="2" />
            <circle cx="50" cy="50" r="22" fill="#fff" stroke="#000" strokeWidth="2" />
            <circle cx="50" cy="50" r="14" fill="#000" stroke="#000" strokeWidth="2" />
            <circle cx="50" cy="50" r="6" fill="#fff" />
            <circle cx="50" cy="50" r="2" fill="#000" />
          </svg>
        </div>

        {/* Hypnotic Concentric Spiral 3 (Bottom Left) - Smooth Clockwise Spin */}
        <div className="doodle-sticker doodle-spiral-pos-3">
          <svg viewBox="0 0 100 100" className="doodle-svg-spiral spin-clockwise-slow">
            <circle cx="50" cy="50" r="46" fill="#000" />
            <circle cx="50" cy="50" r="38" fill="#fff" />
            <circle cx="50" cy="50" r="29" fill="#000" />
            <circle cx="50" cy="50" r="20" fill="#fff" />
            <circle cx="50" cy="50" r="12" fill="#000" />
            <circle cx="50" cy="50" r="5" fill="#fff" />
          </svg>
        </div>

        {/* Optical Spiral Star 1 (Top Right) - Jitter Wiggle & Pulse */}
        <div className="doodle-sticker doodle-star-pos-1 wiggle-star-1">
          <svg viewBox="0 0 100 100" className="doodle-svg-star">
            {/* Outer Star */}
            <polygon
              points="50,5 64,36 98,36 71,57 81,91 50,70 19,91 29,57 2,36 36,36"
              fill="#000"
              stroke="#000"
              strokeWidth="2"
            />
            {/* Concentric Layer 1 */}
            <polygon
              points="50,14 61,38 88,38 67,55 75,81 50,65 25,81 33,55 12,38 39,38"
              fill="#fff"
            />
            {/* Concentric Layer 2 */}
            <polygon
              points="50,23 58,40 78,40 62,53 68,73 50,60 32,73 38,53 22,40 42,40"
              fill="#000"
            />
            {/* Concentric Layer 3 */}
            <polygon
              points="50,32 55,43 68,43 57,51 61,64 50,56 39,64 43,51 32,43 45,43"
              fill="#fff"
            />
            {/* Star Center */}
            <circle cx="50" cy="50" r="6" fill="#000" />
          </svg>
        </div>

        {/* Optical Spiral Star 2 (Middle Left) - Bouncy Wiggle */}
        <div className="doodle-sticker doodle-star-pos-2 wiggle-star-2">
          <svg viewBox="0 0 100 100" className="doodle-svg-star">
            <polygon
              points="50,6 63,35 96,35 70,55 80,88 50,68 20,88 30,55 4,35 37,35"
              fill="#000"
            />
            <polygon
              points="50,16 60,39 86,39 65,55 73,80 50,64 27,80 35,55 14,39 40,39"
              fill="#fff"
            />
            <polygon
              points="50,26 57,42 75,42 61,54 67,72 50,60 33,72 39,54 25,42 43,42"
              fill="#000"
            />
            <polygon
              points="50,36 54,45 65,45 56,52 60,63 50,56 40,63 44,52 35,45 46,45"
              fill="#fff"
            />
            <circle cx="50" cy="50" r="5" fill="#000" />
          </svg>
        </div>

        {/* Wiggling Hand-Drawn Treble Clef (Center) */}
        <div className="doodle-sticker doodle-clef-pos wiggle-note-clef">
          <svg viewBox="0 0 60 140" className="doodle-svg-clef" fill="#000">
            <path d="M30,12 C28,12 25,14 24,19 C22,26 23,37 25,48 C20,53 14,60 12,68 C9,80 12,94 22,98 C24,99 26,99 28,99 C25,108 24,118 24,124 C24,130 26,134 30,134 C34,134 37,130 36,124 C35,116 30,111 26,110 C27,104 28,97 30,90 C36,92 43,90 47,84 C51,77 50,66 45,60 C40,54 34,51 29,51 C28,42 27,33 28,24 C29,19 32,16 34,16 C37,16 39,18 40,22 C41,20 42,16 40,14 C38,12 34,12 30,12 Z M28,62 C33,62 38,65 41,70 C43,74 43,80 40,84 C37,87 32,88 28,86 C28,78 28,70 28,62 Z M25,65 C25,74 25,82 25,89 C20,87 18,79 20,72 C21,68 23,66 25,65 Z" />
          </svg>
        </div>

        {/* Dancing Eighth Note 1 (Upper Center) */}
        <div className="doodle-sticker doodle-note-pos-1 wiggle-note-1">
          <svg viewBox="0 0 50 60" className="doodle-svg-note" fill="#000">
            <ellipse cx="16" cy="46" rx="14" ry="10" transform="rotate(-25 16 46)" />
            <rect x="25" y="8" width="5" height="40" rx="2" />
            <path d="M28,8 C36,8 45,14 44,28 C38,24 33,20 28,21 Z" />
          </svg>
        </div>

        {/* Dancing Beamed Sixteenth Notes (Middle Right) */}
        <div className="doodle-sticker doodle-note-pos-2 wiggle-note-2">
          <svg viewBox="0 0 70 70" className="doodle-svg-note" fill="#000">
            <ellipse cx="16" cy="56" rx="12" ry="8" transform="rotate(-25 16 56)" />
            <ellipse cx="52" cy="46" rx="12" ry="8" transform="rotate(-25 52 46)" />
            <rect x="23" y="14" width="5" height="44" rx="2" />
            <rect x="59" y="4" width="5" height="44" rx="2" />
            <polygon points="23,14 64,4 64,12 23,22" />
            <polygon points="23,26 64,16 64,24 23,34" />
          </svg>
        </div>

        {/* Dancing Eighth Note 2 (Lower Right) */}
        <div className="doodle-sticker doodle-note-pos-3 wiggle-note-3">
          <svg viewBox="0 0 50 60" className="doodle-svg-note" fill="#000">
            <ellipse cx="16" cy="46" rx="14" ry="10" transform="rotate(-25 16 46)" />
            <rect x="25" y="10" width="5" height="38" rx="2" />
            <path d="M28,10 C38,10 46,18 43,30 C38,24 33,22 28,23 Z" />
          </svg>
        </div>

        {/* Floating Mini Piano Block (Center-Left) */}
        <div className="doodle-sticker doodle-piano-pos wiggle-piano">
          <svg viewBox="0 0 70 45" className="doodle-svg-piano">
            <rect x="2" y="2" width="66" height="41" rx="4" fill="#fff" stroke="#000" strokeWidth="3" />
            {/* White keys separation lines */}
            <line x1="15" y1="2" x2="15" y2="43" stroke="#000" strokeWidth="2" />
            <line x1="28" y1="2" x2="28" y2="43" stroke="#000" strokeWidth="2" />
            <line x1="41" y1="2" x2="41" y2="43" stroke="#000" strokeWidth="2" />
            <line x1="55" y1="2" x2="55" y2="43" stroke="#000" strokeWidth="2" />
            {/* Black keys */}
            <rect x="9" y="2" width="10" height="25" rx="1.5" fill="#000" />
            <rect x="22" y="2" width="10" height="25" rx="1.5" fill="#000" />
            <rect x="49" y="2" width="10" height="25" rx="1.5" fill="#000" />
          </svg>
        </div>

        {/* Wiggling Doodle Heart (Top Mid-Left) */}
        <div className="doodle-sticker doodle-heart-pos-1 wiggle-heart">
          <svg viewBox="0 0 40 40" className="doodle-svg-heart">
            <path
              d="M20,34 C12,26 4,18 4,11 C4,5 8,2 13,2 C17,2 19,4 20,7 C21,4 23,2 27,2 C32,2 36,5 36,11 C36,18 28,26 20,34 Z"
              fill="none"
              stroke="#000"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Wiggling Doodle Heart (Lower Center) */}
        <div className="doodle-sticker doodle-heart-pos-2 wiggle-heart-alt">
          <svg viewBox="0 0 40 40" className="doodle-svg-heart">
            <path
              d="M20,34 C12,26 4,18 4,11 C4,5 8,2 13,2 C17,2 19,4 20,7 C21,4 23,2 27,2 C32,2 36,5 36,11 C36,18 28,26 20,34 Z"
              fill="#000"
              stroke="#000"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Little Twinkle Sparkle Stars */}
        <div className="doodle-sticker doodle-twinkle-pos-1 twinkle-star">★</div>
        <div className="doodle-sticker doodle-twinkle-pos-2 twinkle-star-alt">✦</div>
        <div className="doodle-sticker doodle-twinkle-pos-3 twinkle-star">★</div>
        <div className="doodle-sticker doodle-twinkle-pos-4 twinkle-star-alt">♫</div>

        {/* Interactive Mouse Trails / Spawning Notes */}
        {sparkles.map((sparkle) => (
          <span
            key={sparkle.id}
            className="doodle-interactive-sparkle"
            style={{
              left: `${sparkle.x}px`,
              top: `${sparkle.y}px`,
              transform: `rotate(${sparkle.rotation}deg)`,
            }}
          >
            {sparkle.symbol}
          </span>
        ))}
      </div>

      {/* Subtle Bottom Badge Overlay */}
      <div className="doodle-badge-pill">
        <span className="doodle-badge-dot" />
        <span>Vibe &amp; Beats Flow</span>
      </div>
    </div>
  );
};
