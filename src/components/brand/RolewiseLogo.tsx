'use client';

import React from 'react';

interface RolewiseLogoProps {
  collapsed?: boolean;
  className?: string;
}

export const RolewiseLogo: React.FC<RolewiseLogoProps> = ({ collapsed = false, className = '' }) => {
  if (collapsed) {
    return (
      <svg
        viewBox="0 0 160 160"
        role="img"
        aria-label="ROLEWISE"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M31 22h48c31 0 52 17 52 43 0 20-11 33-29 40l28 28-25 25-47-47v39H31V22Zm27 27v35h21c13 0 22-7 22-18 0-11-9-17-22-17H58Z"
          fill="#1B1E22"
        />
        <path d="M34 61h57l-30 48L34 61Z" fill="#FFD84D" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 760 160"
      role="img"
      aria-label="ROLEWISE"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(0 0)">
        <path
          d="M31 22h48c31 0 52 17 52 43 0 20-11 33-29 40l28 28-25 25-47-47v39H31V22Zm27 27v35h21c13 0 22-7 22-18 0-11-9-17-22-17H58Z"
          fill="#1B1E22"
        />
        <path d="M34 61h57l-30 48L34 61Z" fill="#FFD84D" />
      </g>
      <text
        x="150"
        y="116"
        fill="#1B1E22"
        fontFamily="Arial Black, Inter, sans-serif"
        fontSize="82"
        fontWeight="900"
        letterSpacing="-5"
      >ROLEWISE</text>
      <path d="M510 48h38l-19 31-19-31Z" fill="#FFD84D" />
    </svg>
  );
};
