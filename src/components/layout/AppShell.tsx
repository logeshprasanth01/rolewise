'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Layers,
  Bot,
  MessageSquare,
  Clock,
  FileText,
  Settings,
  Search,
  Bell,
  LogOut,
  Plus,
  ChevronDown,
  User as UserIcon,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthView } from '@/components/auth/AuthView';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { userName, session, isLoading, signOut } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Exact navigation specified in PRD Requirement 2
  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'My Jobs', href: '/jobs', icon: Briefcase },
    { label: 'Preparation', href: '/preparation', icon: Layers },
    { label: 'AI Interview', href: '/roles', icon: Bot },
    { label: 'Communication', href: '/communication-practice', icon: MessageSquare },
    { label: 'Feedback', href: '/feedback', icon: Clock },
    { label: 'Resume', href: '/resume', icon: FileText },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const isNavActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/jobs') return pathname === '/jobs' || pathname.startsWith('/jobs/new');
    if (href === '/roles') return pathname.includes('/interview');
    return pathname?.startsWith(href);
  };

  // Redirect to /auth when unauthenticated
  useEffect(() => {
    if (!isLoading && !session && pathname !== '/auth') {
      router.replace('/auth');
    }
  }, [isLoading, session, pathname, router]);

  // If loading session, show clean calm loader
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7FB] flex flex-col items-center justify-center gap-3 text-[#667085]">
        <div className="w-10 h-10 rounded-2xl bg-[#6D5DFB] flex items-center justify-center text-white font-bold text-lg shadow-sm animate-pulse">
          R
        </div>
        <p className="text-xs font-medium tracking-wide">Loading ROLEWISE workspace...</p>
      </div>
    );
  }

  // PRD Gate: Unauthenticated users must not access protected application screens
  if (!session) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-[#F7F7FB] text-[#1F2937] flex flex-col font-sans">
      {/* DESKTOP SIDEBAR (1440px / 1024px) */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-[#E7E8EF] flex-col justify-between py-6 px-4 z-30">
        <div className="space-y-6">
          {/* Brand Logo & Tagline Header */}
          <Link href="/" className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-[#6D5DFB] flex items-center justify-center text-white font-bold text-base shadow-sm">
              R
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-[#1F2937]">ROLEWISE</span>
            </div>
          </Link>

          {/* Primary Navigation - Left aligned */}
          <nav className="space-y-1" aria-label="Desktop primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavActive(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`w-full min-h-[44px] flex items-center justify-start text-left gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? 'bg-[#EEECFF] text-[#6D5DFB] font-semibold'
                      : 'text-[#667085] hover:text-[#1F2937] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#6D5DFB]' : 'text-[#667085]'}`} />
                  <span className="text-left font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile Section */}
        <div className="border-t border-[#E7E8EF] pt-4 space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#EEECFF] text-[#6D5DFB] font-bold text-xs flex items-center justify-center shrink-0">
                {userName ? userName[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#1F2937] truncate">{userName || 'Candidate'}</p>
                <p className="text-[11px] text-[#667085] truncate">Free Workspace</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="p-1.5 rounded-lg text-[#667085] hover:text-[#E87967] hover:bg-[#FFF0ED] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* TABLET SIDEBAR (768px - 1024px) */}
      <aside className="hidden md:flex lg:hidden fixed top-0 left-0 bottom-0 w-[72px] bg-white border-r border-[#E7E8EF] flex-col items-center justify-between py-6 z-30">
        <Link
          href="/"
          className="w-10 h-10 rounded-2xl bg-[#6D5DFB] flex items-center justify-center text-white font-bold text-lg shadow-sm"
        >
          R
        </Link>

        <nav className="flex flex-col items-center gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                title={item.label}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#EEECFF] text-[#6D5DFB]'
                    : 'text-[#667085] hover:text-[#1F2937] hover:bg-[#F9FAFB]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => signOut()}
          title="Sign out"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#667085] hover:text-[#E87967] hover:bg-[#FFF0ED]"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 md:pl-[72px] lg:pl-64 flex flex-col min-h-screen">
        {/* TOP BAR */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-[#E7E8EF] px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          {/* Mobile Brand / Extended Search input */}
          <div className="flex items-center gap-3 flex-1 max-w-xl lg:max-w-2xl pr-4">
            <Link href="/" className="md:hidden flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#6D5DFB] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                R
              </div>
              <span className="font-bold text-sm tracking-tight text-[#1F2937]">ROLEWISE</span>
            </Link>

            {/* Extended Global Search Bar for High Readability */}
            <div className="hidden sm:flex items-center gap-2.5 w-full h-10 px-3.5 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] text-xs text-[#667085] focus-within:border-[#6D5DFB] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#6D5DFB]/10 transition-all">
              <Search className="w-4 h-4 text-[#98A2B3] shrink-0" />
              <input
                type="text"
                placeholder="Search jobs, interviews, or topics..."
                className="bg-transparent border-none outline-none flex-1 min-w-0 text-xs sm:text-sm text-[#1F2937] placeholder:text-[#98A2B3]"
              />
              <kbd className="inline-flex items-center justify-center shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white border border-[#D0D5DD] text-[#344054] shadow-2xs">
                Ctrl K
              </kbd>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/jobs/new"
              className="touch-target inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Job</span>
            </Link>

            <button
              title="Notifications"
              className="w-9 h-9 rounded-xl border border-[#E7E8EF] bg-white flex items-center justify-center text-[#667085] hover:text-[#1F2937] hover:bg-[#F9FAFB] transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#6D5DFB] absolute top-2 right-2" />
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#F9FAFB] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#6D5DFB] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {userName ? userName[0].toUpperCase() : 'L'}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-[#1F2937]">
                  {userName ? userName.split(' ')[0] : 'Logesh'}
                </span>
                <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-[#667085]" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E7E8EF] rounded-xl shadow-lg py-1 z-50">
                  <div className="px-3 py-2 border-b border-[#E7E8EF]">
                    <p className="text-xs font-semibold text-[#1F2937]">{userName || 'Logesh Prasanth'}</p>
                    <p className="text-[11px] text-[#667085] truncate">{session.user?.email || 'logesh@rolewise.io'}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-[#1F2937] hover:bg-[#F9FAFB]"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#667085]" />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#E87967] hover:bg-[#FFF0ED] text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* MAIN PAGE VIEW */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-12">
          {children}
        </main>

        {/* MOBILE BOTTOM NAVIGATION (390px mobile-first) */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-[#E7E8EF] z-40 px-1 py-1 flex items-center justify-around shadow-[0_-1px_3px_rgba(0,0,0,0.03)]"
          aria-label="Mobile bottom navigation"
        >
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`touch-target flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                  active ? 'text-[#6D5DFB]' : 'text-[#667085] hover:text-[#1F2937]'
                }`}
              >
                <div
                  className={`w-8 h-6 rounded-lg flex items-center justify-center transition-colors ${
                    active ? 'bg-[#EEECFF]' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] mt-0.5 ${active ? 'font-semibold' : 'font-normal'}`}>
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
