'use client';

import React, { useEffect, useState } from 'react';

const STATUS_LINES = ['Restoring your session', 'Syncing your roles', 'Setting up your workspace'];

/**
 * First-paint screen while the auth session restores.
 * Content fades in after a short delay, so fast loads never flash a loader.
 */
export function BootScreen() {
  const [line, setLine] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLine((l) => (l + 1) % STATUS_LINES.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="rw-boot min-h-screen w-full flex items-center justify-center px-6"
      role="status"
      aria-live="polite"
      aria-label="Loading ROLEWISE"
    >
      <div className="rw-boot-content flex flex-col items-center" style={{ animationDelay: '150ms' }}>
        <div className="rw-boot-mark flex items-center justify-center">
          <span className="rw-boot-orbit" aria-hidden="true" />
          <span className="text-[34px] font-bold leading-none tracking-[-0.04em] text-[#FFD84D]" aria-hidden="true">
            R
          </span>
        </div>

        <p className="mt-8 text-[15px] font-bold tracking-[0.32em] text-[#252525] pl-[0.32em]">ROLEWISE</p>

        <p className="mt-2 text-[13px] text-[#73757A] tracking-[0.01em]">
          Prepare for the role. Not just the interview.
        </p>

        <div className="rw-boot-track mt-9 h-[3px] w-44 rounded-full bg-[#252525]/10" aria-hidden="true">
          <span />
        </div>

        <p key={line} className="rw-boot-word mt-4 h-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[#55565A]">
          {STATUS_LINES[line]}
        </p>
      </div>
    </div>
  );
}
