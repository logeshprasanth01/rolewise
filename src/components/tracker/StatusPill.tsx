import React from 'react';
import type { ApplicationStatus } from '@/types/database';
import { STATUS_META } from '@/lib/tracker';

export function StatusPill({ status, size = 'md' }: { status: ApplicationStatus; size?: 'sm' | 'md' }) {
  const meta = STATUS_META[status] || STATUS_META.saved;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}
      style={{ background: meta.bg, color: meta.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
