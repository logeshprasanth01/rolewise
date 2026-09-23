'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Briefcase,
  Layers,
  User,
  AlertTriangle,
  PlusCircle,
  Mic,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const { userName, session, openAuthModal } = useAuth();

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Jobs', href: '/jobs/new', icon: Briefcase },
    { label: 'Preparation', href: '/preparation', icon: Layers },
    { label: 'Practice', href: '/communication-practice', icon: Mic },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  const isNavActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#F7F7FB] text-[#1F2937] flex flex-col font-sans">
      <AuthModal />

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-[76px] bg-white border-r border-[#E7E8EF] flex-col items-center justify-between py-6 z-30">
        {/* Brand Logo */}
        <Link
          href="/"
          className="w-10 h-10 rounded-2xl bg-[#6D5DFB] flex items-center justify-center text-white font-bold text-lg shadow-sm hover:scale-105 transition-transform"
        >
          R
        </Link>

        {/* Primary Navigation Icons */}
        <nav className="flex flex-col items-center gap-6" aria-label="Desktop primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all touch-target ${
                  isActive
                    ? 'bg-[#EEECFF] text-[#6D5DFB]'
                    : 'text-[#667085] hover:text-[#1F2937] hover:bg-[#F7F7FB]'
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile / Quick Action */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => openAuthModal(session ? 'signin' : 'signin')}
            className="w-10 h-10 rounded-full bg-[#EEECFF] text-[#6D5DFB] font-semibold text-xs flex items-center justify-center hover:ring-2 hover:ring-[#6D5DFB] transition-all touch-target"
            title={session ? (userName || 'Your Account') : 'Sign in'}
          >
            {session && userName ? userName.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 md:pl-[76px] flex flex-col min-h-screen">
        {/* TOP BAR */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-[#E7E8EF] px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="md:hidden flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#6D5DFB] flex items-center justify-center text-white font-bold text-base shadow-sm">
                R
              </div>
              <span className="font-semibold text-base tracking-tight text-[#1F2937]">
                ROLEWISE
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-2 text-xs text-[#667085]">
              <span className="font-semibold text-[#1F2937] tracking-tight">ROLEWISE</span>
              <span>·</span>
              <span className="text-[#667085]">Prepare for the role. Not just the interview.</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs sm:text-sm font-medium transition-colors shadow-sm touch-target"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Job</span>
            </Link>

            {session ? (
              <button
                onClick={() => openAuthModal()}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#1F2937] hover:bg-[#F7F7FB] border border-[#E7E8EF] transition-colors touch-target"
              >
                <div className="w-6 h-6 rounded-full bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center font-bold text-[11px]">
                  {userName ? userName[0].toUpperCase() : 'U'}
                </div>
                <span className="hidden sm:inline">{userName || 'Account'}</span>
              </button>
            ) : (
              <button
                onClick={() => openAuthModal('signin')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#6D5DFB] bg-[#EEECFF] hover:bg-[#E2DEFD] transition-colors touch-target"
              >
                <span>Sign in</span>
              </button>
            )}
          </div>
        </header>

        {/* MAIN PAGE VIEW */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-12">
          {children}
        </main>

        {/* MOBILE BOTTOM NAVIGATION (390 x 844 mobile-first) */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-[#E7E8EF] z-40 px-2 py-1 flex items-center justify-around shadow-[0_-1px_3px_rgba(0,0,0,0.03)]"
          aria-label="Mobile bottom navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`touch-target flex-1 flex flex-col items-center justify-center py-1.5 transition-colors ${
                  active ? 'text-[#6D5DFB]' : 'text-[#667085] hover:text-[#1F2937]'
                }`}
              >
                <div
                  className={`w-9 h-7 rounded-xl flex items-center justify-center transition-colors ${
                    active ? 'bg-[#EEECFF]' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[11px] mt-0.5 ${active ? 'font-semibold' : 'font-normal'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
