import React, { useId } from 'react';
import type { LucideIcon } from 'lucide-react';

export type GlossyTone = 'yellow' | 'ink' | 'green' | 'coral' | 'cream' | 'orange';
export type GlossyShape = 'hex' | 'squircle';

const TONES: Record<GlossyTone, { top: string; bottom: string; rim: string; glyph: string }> = {
  yellow: { top: '#FFEB9C', bottom: '#F6C23E', rim: '#C98E28', glyph: '#252525' },
  ink: { top: '#5A5A5E', bottom: '#252525', rim: '#0E0E0F', glyph: '#FFD84D' },
  green: { top: '#B4DCBE', bottom: '#6FA77F', rim: '#4C8059', glyph: '#FFFFFF' },
  coral: { top: '#F7BCAF', bottom: '#D97968', rim: '#A9503F', glyph: '#FFFFFF' },
  cream: { top: '#FFFFFF', bottom: '#ECE9DE', rim: '#C8C3B3', glyph: '#252525' },
  orange: { top: '#FFC48A', bottom: '#F2873A', rim: '#BF5F1C', glyph: '#FFFFFF' },
};

// Flat-topped hexagon inside a 100x100 box, corners rounded via a thick round-joined stroke.
const HEX = '50,10 86,30 86,70 50,90 14,70 14,30';

/**
 * Glossy 3D-style icon tile (rounded hex or squircle) with a line icon on top.
 * Decorative by default.
 */
export function GlossyIcon({
  icon: Icon,
  tone = 'yellow',
  shape = 'hex',
  size = 72,
  className = '',
}: {
  icon: LucideIcon;
  tone?: GlossyTone;
  shape?: GlossyShape;
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const t = TONES[tone];
  const face = `face-${uid}`;
  const shine = `shine-${uid}`;

  const shapeEl = (fill: string, dy = 0) =>
    shape === 'hex' ? (
      <polygon points={HEX} transform={`translate(0 ${dy})`} fill={fill} stroke={fill} strokeWidth="14" strokeLinejoin="round" />
    ) : (
      <rect x="10" y={10 + dy} width="80" height="80" rx="26" fill={fill} />
    );

  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 100 106" width={size} height={size * 1.06} className="absolute inset-0 overflow-visible drop-shadow-[0_14px_16px_rgba(37,37,37,0.28)]">
        <defs>
          <linearGradient id={face} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor={t.top} />
            <stop offset="1" stopColor={t.bottom} />
          </linearGradient>
          <radialGradient id={shine} cx="0.3" cy="0.18" r="0.6">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.75" />
            <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>
        {shapeEl(t.rim, 6)}
        {shapeEl(`url(#${face})`)}
        {shapeEl(`url(#${shine})`)}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: size * 0.04 }}>
        <Icon
          style={{ width: size * 0.4, height: size * 0.4, color: t.glyph, filter: 'drop-shadow(0 1.5px 1px rgba(0,0,0,0.18))' }}
          strokeWidth={2.4}
        />
      </span>
    </span>
  );
}
