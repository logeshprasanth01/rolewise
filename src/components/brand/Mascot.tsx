'use client';

import React, { useEffect, useId, useRef } from 'react';

interface MascotProps {
  size?: number;
  /** Eyes follow the pointer (fine pointers only, off for reduced motion). */
  track?: boolean;
  /** Gentle idle bob and a periodic wave. */
  animated?: boolean;
  className?: string;
  title?: string;
}

/**
 * Rolewise mascot: a glossy yellow "prep buddy" with an ink bow tie
 * (interview-ready) that blinks, bobs and watches the cursor.
 */
export function Mascot({ size = 140, track = true, animated = true, className = '', title }: MascotProps) {
  const uid = useId().replace(/:/g, '');
  const rootRef = useRef<SVGSVGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!track) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const svg = rootRef.current;
        const eyes = eyesRef.current;
        if (!svg || !eyes) return;
        const r = svg.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height * 0.45);
        const dist = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, dist / 260);
        eyes.style.transform = `translate(${((dx / dist) * 5 * k).toFixed(2)}px, ${((dy / dist) * 4 * k).toFixed(2)}px)`;
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [track]);

  const g = (n: string) => `${n}-${uid}`;

  return (
    <svg
      ref={rootRef}
      viewBox="0 0 160 176"
      width={size}
      height={(size * 176) / 160}
      className={`rw-mascot ${animated ? 'rw-mascot--animated' : ''} ${className}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={g('body')} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#FFE992" />
          <stop offset="0.45" stopColor="#FFD84D" />
          <stop offset="1" stopColor="#F0B53A" />
        </linearGradient>
        <linearGradient id={g('rim')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E0A436" />
          <stop offset="1" stopColor="#B97F22" />
        </linearGradient>
        <radialGradient id={g('shine')} cx="0.32" cy="0.22" r="0.55">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.18" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g('shadow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#252525" stopOpacity="0.28" />
          <stop offset="1" stopColor="#252525" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={g('arm')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE27A" />
          <stop offset="1" stopColor="#E8AC36" />
        </linearGradient>
      </defs>

      {/* ground shadow */}
      <ellipse className="rw-mascot-shadow" cx="80" cy="166" rx="46" ry="7" fill={`url(#${g('shadow')})`} />

      <g className="rw-mascot-body">
        {/* waving arm (behind body) */}
        <g className="rw-mascot-arm">
          <rect x="128" y="62" width="22" height="40" rx="11" fill={`url(#${g('arm')})`} transform="rotate(28 139 96)" />
        </g>
        {/* left arm */}
        <rect x="8" y="88" width="20" height="34" rx="10" fill={`url(#${g('arm')})`} transform="rotate(-18 18 105)" />

        {/* 3D thickness */}
        <rect x="18" y="26" width="124" height="124" rx="46" fill={`url(#${g('rim')})`} />
        {/* face */}
        <rect x="18" y="18" width="124" height="124" rx="46" fill={`url(#${g('body')})`} />
        <rect x="18" y="18" width="124" height="124" rx="46" fill={`url(#${g('shine')})`} />
        <rect x="18.75" y="18.75" width="122.5" height="122.5" rx="45.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.5" />

        {/* cheeks */}
        <ellipse cx="46" cy="92" rx="10" ry="6" fill="#D97968" opacity="0.35" />
        <ellipse cx="114" cy="92" rx="10" ry="6" fill="#D97968" opacity="0.35" />

        {/* eyes */}
        <g className="rw-mascot-blink">
          <g ref={eyesRef} className="rw-mascot-eyes">
            <ellipse cx="60" cy="72" rx="8.5" ry="11" fill="#252525" />
            <ellipse cx="100" cy="72" rx="8.5" ry="11" fill="#252525" />
            <circle cx="63" cy="67.5" r="3.2" fill="#FFFFFF" />
            <circle cx="103" cy="67.5" r="3.2" fill="#FFFFFF" />
          </g>
        </g>

        {/* smile */}
        <path d="M68 96 Q80 106 92 96" fill="none" stroke="#252525" strokeWidth="4.5" strokeLinecap="round" />

        {/* bow tie: interview-ready */}
        <g transform="translate(80 128)">
          <path d="M-3 0 L-17 -8 Q-20 0 -17 8 Z" fill="#252525" />
          <path d="M3 0 L17 -8 Q20 0 17 8 Z" fill="#252525" />
          <rect x="-4.5" y="-4.5" width="9" height="9" rx="2.5" fill="#3A3A3A" />
        </g>
      </g>
    </svg>
  );
}
