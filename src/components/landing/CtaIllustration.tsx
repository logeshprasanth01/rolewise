import React from 'react';

/**
 * Flat, ink-outlined illustration for the closing yellow band:
 * the prep buddy next to a checked-off resume, a fit score and an interview bubble.
 */
export function CtaIllustration() {
  const ink = '#252525';
  return (
    <svg viewBox="0 0 380 320" className="h-auto w-full" role="img" aria-label="The Rolewise prep buddy celebrating next to a checked-off resume and an 84% fit score">
      {/* backdrop */}
      <circle cx="200" cy="160" r="140" fill="#FFFFFF" opacity="0.28" />
      <circle cx="200" cy="160" r="104" fill="#FFFFFF" opacity="0.22" />

      {/* ground */}
      <path d="M40 286 H350" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M70 296 H130 M250 296 H320" stroke={ink} strokeWidth="3" strokeLinecap="round" opacity="0.35" />

      {/* resume sheet */}
      <g transform="rotate(-7 160 150)">
        <rect x="96" y="58" width="132" height="176" rx="14" fill="#FFFFFF" stroke={ink} strokeWidth="3" />
        <rect x="112" y="76" width="44" height="8" rx="4" fill={ink} />
        <rect x="112" y="92" width="84" height="6" rx="3" fill={ink} opacity="0.25" />
        {[120, 146, 172].map((y, i) => (
          <g key={y}>
            <circle cx="120" cy={y + 3} r="8" fill={i < 2 ? '#6FA77F' : '#FFD84D'} stroke={ink} strokeWidth="2.5" />
            {i < 2 ? (
              <path d={`M116 ${y + 3} l3 3 l6 -6`} fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d={`M120 ${y - 1} v4.5 M120 ${y + 7} v0.5`} stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
            )}
            <rect x="134" y={y - 1} width={i === 1 ? 62 : 76} height="7" rx="3.5" fill={ink} opacity="0.2" />
          </g>
        ))}
        <rect x="112" y="200" width="98" height="14" rx="7" fill="#FFD84D" stroke={ink} strokeWidth="2.5" />
      </g>

      {/* interview bubble */}
      <g>
        <path
          d="M246 40 h92 a16 16 0 0 1 16 16 v34 a16 16 0 0 1 -16 16 h-58 l-18 16 v-16 h-16 a16 16 0 0 1 -16 -16 v-34 a16 16 0 0 1 16 -16 z"
          fill={ink}
        />
        <circle cx="270" cy="73" r="6" fill="#FFD84D" className="rwl-dot" />
        <circle cx="292" cy="73" r="6" fill="#FFD84D" className="rwl-dot [animation-delay:150ms]" />
        <circle cx="314" cy="73" r="6" fill="#FFD84D" className="rwl-dot [animation-delay:300ms]" />
      </g>

      {/* fit score card */}
      <g transform="rotate(4 70 200)">
        <rect x="18" y="176" width="112" height="70" rx="14" fill="#FFFFFF" stroke={ink} strokeWidth="3" />
        <text x="32" y="214" fontFamily="var(--font-inter), system-ui, sans-serif" fontSize="28" fontWeight="700" fill={ink}>
          84%
        </text>
        <rect x="32" y="224" width="20" height="7" rx="3.5" fill="#6FA77F" />
        <rect x="55" y="224" width="20" height="7" rx="3.5" fill="#6FA77F" />
        <rect x="78" y="224" width="16" height="7" rx="3.5" fill="#D49A35" />
        <rect x="97" y="224" width="16" height="7" rx="3.5" fill="#D97968" />
      </g>

      {/* buddy (flat) */}
      <g transform="translate(262 168)">
        <g className="rwl-cheer">
          <rect x="76" y="6" width="18" height="38" rx="9" fill="#FFD84D" stroke={ink} strokeWidth="3" transform="rotate(-30 85 40)" />
          <rect x="-12" y="52" width="18" height="32" rx="9" fill="#FFD84D" stroke={ink} strokeWidth="3" transform="rotate(20 -3 68)" />
          <rect x="0" y="22" width="84" height="84" rx="30" fill="#FFD84D" stroke={ink} strokeWidth="3" />
          <path d="M10 44 q6 -14 22 -16" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
          <ellipse cx="29" cy="58" rx="5.5" ry="7.5" fill={ink} />
          <ellipse cx="55" cy="58" rx="5.5" ry="7.5" fill={ink} />
          <circle cx="31" cy="55" r="2" fill="#FFFFFF" />
          <circle cx="57" cy="55" r="2" fill="#FFFFFF" />
          <path d="M33 74 q9 9 18 0" fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M40 98 l-11 -6 q-2 6 0 12 z M44 98 l11 -6 q2 6 0 12 z" fill={ink} />
          <rect x="22" y="104" width="12" height="14" rx="5" fill={ink} />
          <rect x="50" y="104" width="12" height="14" rx="5" fill={ink} />
        </g>
      </g>

      {/* sparkles */}
      {[
        [62, 70, 1],
        [236, 140, 0.8],
        [350, 150, 0.9],
        [40, 134, 0.7],
      ].map(([x, y, sc], i) => (
        <path
          key={i}
          d="M0 -10 Q2 -2 10 0 Q2 2 0 10 Q-2 2 -10 0 Q-2 -2 0 -10 Z"
          fill={ink}
          transform={`translate(${x} ${y}) scale(${sc})`}
          className="rwl-twinkle"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </svg>
  );
}
