'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Briefcase, LogOut, Mic, Pencil, Send, Settings, Target } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getInterviewHistory, getUserRoles } from '@/services/api';
import type { Role } from '@/types/database';

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  linkedin_oidc: 'LinkedIn',
  linkedin: 'LinkedIn',
  email: 'Email and password',
};

function formatMonthYear(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function ProfilePage() {
  const { user, userName, signOut } = useAuth();
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [interviewCount, setInterviewCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUserRoles()
      .then((r) => !cancelled && setRoles(r))
      .catch(() => !cancelled && setRoles([]));
    getInterviewHistory()
      .then((h) => !cancelled && setInterviewCount(h.length))
      .catch(() => !cancelled && setInterviewCount(0));
    return () => {
      cancelled = true;
    };
  }, []);

  const avatarUrl = (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) as string | undefined;
  const provider = (user?.app_metadata?.provider as string | undefined) || 'email';
  const memberSince = formatMonthYear(user?.created_at);
  const initial = (userName || user?.email || 'U')[0].toUpperCase();

  const applied = roles?.filter((r) => r.application_status && r.application_status !== 'saved').length ?? null;
  const interviewing = roles?.filter((r) => r.application_status === 'interview').length ?? null;

  const stats = [
    { label: 'Jobs tracked', value: roles?.length ?? null, icon: Briefcase, href: '/jobs' },
    { label: 'Applied', value: applied, icon: Send, href: '/jobs' },
    { label: 'In interviews', value: interviewing, icon: Target, href: '/jobs' },
    { label: 'Mock interviews', value: interviewCount, icon: Mic, href: '/feedback' },
  ];

  return (
    <div className="max-w-3xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Identity */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#252525] text-white p-6 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,216,77,0.35) 0%, rgba(255,216,77,0) 70%)' }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-[22px] object-cover ring-4 ring-white/10"
            />
          ) : (
            <div className="h-20 w-20 rounded-[22px] bg-[#FFD84D] text-[#252525] flex items-center justify-center text-3xl font-bold ring-4 ring-white/10">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-[-0.02em] truncate">{userName || 'Your profile'}</h1>
            <p className="mt-1 text-sm text-white/70 truncate">{user?.email}</p>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
              <span>Signed in with {PROVIDER_LABEL[provider] || provider}</span>
              {memberSince && <span>Member since {memberSince}</span>}
            </p>
          </div>
          <Link
            href="/settings"
            className="self-start sm:self-center inline-flex items-center gap-2 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 px-4 text-sm font-semibold transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit profile
          </Link>
        </div>
      </section>

      {/* Activity */}
      <section className="mt-6" aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="text-sm font-semibold text-[#252525]">
          Your activity
        </h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              className="group rounded-[20px] bg-white border border-[#E4E2DA] p-4 hover:border-[#252525] transition-colors"
            >
              <Icon className="w-4 h-4 text-[#9A9B9E] group-hover:text-[#252525] transition-colors" />
              <p className="mt-3 text-2xl font-bold tabular-nums text-[#252525]">
                {value === null ? <span className="inline-block h-7 w-8 rounded-md bg-[#F1EFE8] animate-pulse align-middle" /> : value}
              </p>
              <p className="mt-0.5 text-xs text-[#73757A]">{label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Account */}
      <section className="mt-6 rounded-[20px] bg-white border border-[#E4E2DA] divide-y divide-[#EEECE6]" aria-label="Account">
        <Link href="/settings" className="flex items-center gap-3 px-5 py-4 hover:bg-[#FAF9F6] transition-colors rounded-t-[20px]">
          <Settings className="w-4 h-4 text-[#73757A]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#252525]">Settings</p>
            <p className="text-xs text-[#73757A]">Name, photo, email, accessibility, mic and camera check</p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#9A9B9E]" />
        </Link>
        <div className="px-5 py-4">
          <p className="text-sm font-semibold text-[#252525]">Your data</p>
          <p className="mt-1 text-xs text-[#73757A] leading-relaxed">
            Your jobs, resume text, role analysis and saved mock-interview feedback are tied to your account and only
            visible to you. Voice and video recordings are only used to create your transcript and aren&apos;t saved.
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="w-full flex items-center gap-3 px-5 py-4 text-left text-sm font-semibold text-[#A4493A] hover:bg-[#FFF5F2] transition-colors rounded-b-[20px] cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </section>
    </div>
  );
}
