'use client';

import Link from 'next/link';
import { Briefcase, MessageSquare } from 'lucide-react';

/**
 * One "Practice" area with two kinds of practice. Shown at the top of the
 * mock interview and the general drills pages so people can switch without
 * hunting through the navigation.
 */
export function PracticeTabs({ active }: { active: 'job' | 'drills' }) {
  const tab = (key: 'job' | 'drills', href: string, label: string, Icon: typeof Briefcase) => {
    const on = active === key;
    return (
      <Link
        href={href}
        aria-current={on ? 'page' : undefined}
        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 text-xs sm:text-sm font-semibold transition-colors touch-target ${
          on ? 'bg-[#1A1714] text-white' : 'text-[#6B6259] hover:text-[#1A1714] hover:bg-white'
        }`}
      >
        <Icon className="w-3.5 h-3.5" aria-hidden />
        {label}
      </Link>
    );
  };

  return (
    <nav aria-label="Practice type" className="inline-flex items-center gap-1 rounded-full border border-[#E6E0D7] bg-[#FAF8F4] p-1">
      {tab('job', '/roles', 'Mock interview for a job', Briefcase)}
      {tab('drills', '/communication-practice', 'General drills', MessageSquare)}
    </nav>
  );
}
