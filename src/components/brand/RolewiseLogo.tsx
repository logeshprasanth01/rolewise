'use client';

import React from 'react';

interface RolewiseLogoProps {
  collapsed?: boolean;
  className?: string;
}

export const RolewiseLogo: React.FC<RolewiseLogoProps> = ({ collapsed = false, className = '' }) => {
  if (collapsed) {
    return (
      <span
        role="img"
        aria-label="ROLEWISE"
        className={`relative block shrink-0 overflow-hidden ${className}`}
      >
        <img
          src="/rolewise-logo.svg"
          alt="ROLEWISE"
          className="absolute left-0 top-1/2 h-full w-auto max-w-none -translate-y-1/2 object-contain object-left"
        />
      </span>
    );
  }

  return (
    <img
      src="/rolewise-logo.svg"
      alt="ROLEWISE"
      role="img"
      className={`block h-auto w-full object-contain object-left ${className}`}
    />
  );
};
