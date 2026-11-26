'use client';

import React, { useState } from 'react';

const LOGO_TINTS = ['#FFE58A', '#E3EEF9', '#EEF7F0', '#F3EFE9', '#FFF0ED', '#EFEAE3', '#E8F0FF'];

export function tintFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return LOGO_TINTS[h % LOGO_TINTS.length];
}

/**
 * Company logo on a white tile. Falls back to the company's initial on a soft tint when there is no
 * logo, the image fails to load, or the source only has a tiny (blurry) icon.
 * `className` sets size, rounding and the initial's text size.
 */
export function CompanyLogo({
  company,
  logo,
  className = 'w-11 h-11 rounded-xl text-[15px]',
  eager = false,
}: {
  company: string;
  logo: string | null | undefined;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const show = !!logo && !failed;
  return (
    <span
      aria-hidden="true"
      className={`flex items-center justify-center overflow-hidden shrink-0 border border-[#E6E0D7] font-bold text-[#1A1714] ${className}`}
      style={{ background: show ? '#FFFFFF' : tintFor(company) }}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo!}
          alt=""
          className="w-[76%] h-[76%] object-contain"
          loading={eager ? 'eager' : 'lazy'}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth > 0 && e.currentTarget.naturalWidth < 32) setFailed(true);
          }}
        />
      ) : (
        company.charAt(0).toUpperCase()
      )}
    </span>
  );
}
