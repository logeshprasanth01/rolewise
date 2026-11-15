'use client';

import React from 'react';

interface RolewiseLogoProps {
  collapsed?: boolean;
  className?: string;
}

/**
 * Open sidebar → "ROLEWISE" wordmark only.
 * Collapsed sidebar → the R mark only.
 */
export const RolewiseLogo: React.FC<RolewiseLogoProps> = ({ collapsed = false, className = '' }) => {
  if (collapsed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/rolewise-mark.png"
        alt="ROLEWISE"
        width={112}
        height={125}
        draggable={false}
        className={`block h-full w-auto object-contain select-none ${className}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/rolewise-wordmark.png"
      alt="ROLEWISE"
      width={459}
      height={72}
      draggable={false}
      className={`block h-auto w-full object-contain object-left select-none ${className}`}
    />
  );
};
