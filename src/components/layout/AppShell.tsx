'use client';

// Vercel build refresh: AppShell JSX validated

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  ListChecks,
  Mic,
  MessageSquareText,
  FileText,
  Settings,
  Search,
  LogOut,
  Plus,
  ChevronRight,
  PanelLeftClose,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthView } from '@/components/auth/AuthView';
import { playUiSound } from '@/lib/ui-sound';
import { RolewiseLogo } from '@/components/brand/RolewiseLogo';
import { BootScreen } from '@/components/layout/BootScreen';
import { Mascot } from '@/components/brand/Mascot';
import { openRowi } from '@/lib/rowi-events';
import { Avatar, HeaderActions } from '@/components/layout/HeaderActions';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { userName, session, isLoading, signOut } = useAuth();
  const isPublicPage = ['/welcome', '/privacy', '/terms'].some((p) => pathname?.startsWith(p));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [headerQuery, setHeaderQuery] = useState('');

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Job Tracker', href: '/jobs', icon: Briefcase },
    { label: 'Find Jobs', href: '/find-jobs', icon: Search },
    { label: 'Preparation', href: '/preparation', icon: ListChecks },
    { label: 'Practice', href: '/roles', icon: Mic },
    { label: 'Feedback', href: '/feedback', icon: MessageSquareText },
    { label: 'Resume', href: '/resume', icon: FileText },
  ];

  const isNavActive = (href: string) => {
    const isPreparationRoute =
      pathname === '/preparation' ||
      pathname?.startsWith('/preparation/') ||
      pathname?.includes('/preparation');

    if (href === '/') return pathname === '/' || pathname === '/dashboard';
    const isRoleFitRoute = /^\/roles\/[^/]+\/fit/.test(pathname ?? '');
    if (href === '/jobs') return pathname === '/jobs' || pathname.startsWith('/jobs/') || isRoleFitRoute;
    if (href === '/preparation') return isPreparationRoute;
    if (href === '/roles') return (pathname.startsWith('/roles') && !isPreparationRoute && !isRoleFitRoute) || pathname.startsWith('/communication-practice');
    return pathname?.startsWith(href);
  };

  useEffect(() => {
    if (isPublicPage) return;
    if (!isLoading && !session && pathname !== '/auth' && !pathname?.startsWith('/auth/')) {
      // Signed-out visitors to the home page see the public landing page first.
      router.replace(pathname === '/' ? '/welcome' : '/auth');
    }
  }, [isLoading, session, pathname, router, isPublicPage]);

  useEffect(() => {
    // Remember that this browser has an account, so the auth screen opens on "Sign in" next time.
    if (!session) return;
    try {
      window.localStorage.setItem('rw-has-account', '1');
    } catch {
      // storage unavailable
    }
  }, [session]);

  useEffect(() => {
    const saved = window.localStorage.getItem('rolewise-sidebar-collapsed');
    if (saved === 'true') setIsSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('rolewise-sidebar-collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleUiSound = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const trigger = target?.closest<HTMLElement>('[data-ui-sound]');
      if (!trigger) return;
      const type = trigger.dataset.uiSound === 'success' ? 'success' : 'click';
      playUiSound(type);
    };
    document.addEventListener('click', handleUiSound);
    return () => document.removeEventListener('click', handleUiSound);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((value) => !value);
    playUiSound('click');
  };

  // Public pages: no app chrome, no boot screen.
  if (isPublicPage) return <>{children}</>;

  if (isLoading) {
    return <BootScreen />;
  }

  if (!session) {
    if (pathname === '/') return <BootScreen />;
    if (pathname?.startsWith('/auth/callback')) return <>{children}</>;
    return <AuthView />;
  }

  const meta = (session.user?.user_metadata || {}) as Record<string, unknown>;
  const avatarUrl =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) || (typeof meta.picture === 'string' && meta.picture) || null;

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#1A1714] font-sans">
      <div className="min-h-screen w-full bg-[#FAF8F4] flex min-w-0">

        <aside
          className={`hidden lg:flex shrink-0 sticky top-0 h-dvh self-start bg-[#FFFFFF] border-r border-[#E6E0D7] flex-col z-40 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSidebarCollapsed ? 'w-[68px]' : 'w-[248px]'}`}
          aria-label="Sidebar navigation"
        >
          <div className={`relative h-[60px] shrink-0 border-b border-[#E6E0D7]/70 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Open sidebar"
                title="Open sidebar"
                data-ui-sound="click"
                className="w-9 h-9 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
              >
                <RolewiseLogo collapsed className="h-8" />
              </button>
            ) : (
              <>
                <Link
                  href="/"
                  data-ui-sound="click"
                  title="ROLEWISE"
                  className="ml-7 flex items-center overflow-hidden shrink-0 w-[124px] h-9"
                >
                  <RolewiseLogo className="w-[124px]" />
                </Link>

                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Close sidebar"
                  title="Close sidebar"
                  data-ui-sound="click"
                  className="mr-5 flex items-center justify-center shrink-0 w-7 h-7 text-[#6B6259] hover:text-[#1A1714] transition-colors duration-200"
                >
                  <PanelLeftClose className="w-[18px] h-[18px]" />
                </button>
              </>
            )}
          </div>

          <nav className={`py-4 space-y-1 flex-1 overflow-y-auto overflow-x-hidden ${isSidebarCollapsed ? "px-0" : "px-4"}`} aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={isSidebarCollapsed ? item.label : undefined}
                  data-ui-sound="click"
                  className={`group flex items-center min-h-11 text-xs font-semibold transition-all duration-300 ease-out ${isSidebarCollapsed ? 'w-full h-10 min-h-10 p-0 justify-center' : 'w-full h-11 min-h-11 gap-3 rounded-xl px-3'} ${!isSidebarCollapsed && (active ? 'bg-[#1A1714] text-[#FFFFFF] border border-[#1A1714] shadow-[0_4px_12px_rgba(26,23,20,0.12)]' : 'text-[#6B6259] hover:bg-[#FAF8F4] hover:text-[#1A1714]')}`}
                >
                  <span className={`flex items-center justify-center shrink-0 transition-all duration-200 ${isSidebarCollapsed ? `w-10 h-10 rounded-xl ${active ? 'bg-[#1A1714] text-[#FFFFFF] border border-[#1A1714] shadow-[0_4px_12px_rgba(26,23,20,0.12)]' : 'text-[#6B6259]'}` : ''}`}>
                    <Icon className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                  </span>
                  <span
                    className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-200 ease-out ${isSidebarCollapsed ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[150px] opacity-100 translate-x-0'}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className={`py-3 space-y-1.5 border-t border-[#E6E0D7] shrink-0 ${isSidebarCollapsed ? 'px-0' : 'px-4'}`}>
            <Link
              href="/settings"
              title={isSidebarCollapsed ? 'Settings' : undefined}
              data-ui-sound="click"
              className={`flex items-center gap-3 h-10 rounded-xl text-xs font-semibold transition-all duration-300 ${isSidebarCollapsed ? 'w-10 mx-auto p-0 gap-0 justify-center' : 'w-full px-3'} ${isNavActive('/settings') ? 'bg-[#1A1714] text-[#FFFFFF] border border-[#1A1714]' : 'text-[#6B6259] hover:bg-[#FAF8F4] hover:text-[#1A1714]'}`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-200 ${isSidebarCollapsed ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[150px] opacity-100 translate-x-0'}`}>Settings</span>
            </Link>

            {/* Profile + sign out share one row, so the footer stays compact. */}
            <div className={`flex items-center gap-1.5 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
              <Link
                href="/profile"
                data-ui-sound="click"
                title={isSidebarCollapsed ? 'My profile' : undefined}
                aria-label="My profile"
                aria-current={isNavActive('/profile') ? 'page' : undefined}
                className={`flex items-center gap-2.5 min-w-0 border transition-all duration-300 ${
                  isNavActive('/profile') ? 'bg-[#FFFFFF] border-[#1A1714]' : 'bg-[#FAF8F4] border-[#E6E0D7] hover:border-[#CFC7BC] hover:bg-[#EFEEE9]'
                } ${isSidebarCollapsed ? 'w-10 h-10 mx-auto p-0 justify-center rounded-full' : 'flex-1 h-12 px-2 rounded-[14px]'}`}
              >
                <Avatar name={userName} url={avatarUrl} className="w-8 h-8 text-xs" />
                <div className={`min-w-0 text-left flex-1 overflow-hidden ${isSidebarCollapsed ? 'hidden' : ''}`}>
                  <p className="text-xs font-bold text-[#1A1714] truncate">{userName || 'Candidate'}</p>
                  <p className="text-[10px] text-[#6B6259] truncate">{session.user?.email || 'Profile'}</p>
                </div>
              </Link>

              <button
                type="button"
                data-ui-sound="click"
                onClick={() => signOut()}
                title="Sign out"
                aria-label="Sign out"
                className={`flex items-center justify-center shrink-0 w-10 h-10 rounded-xl text-[#6B6259] hover:bg-[#FFF0ED] hover:text-[#D97968] transition-all duration-200 ${isSidebarCollapsed ? 'mx-auto' : ''}`}
              >
                <LogOut className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </aside>

        <div className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-200 ${isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`} aria-hidden={!isMobileMenuOpen}>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-[#1A1714]/25 backdrop-blur-[2px]"
          />
          <aside
            className={`absolute left-0 top-0 bottom-0 w-[min(86vw,320px)] bg-[#FFFFFF] border-r border-[#E6E0D7] shadow-[12px_0_35px_rgba(26,23,20,0.14)] flex flex-col transition-transform duration-200 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            aria-label="Responsive navigation"
          >
            <div className="p-4 border-b border-[#E6E0D7] flex items-center justify-between">
              <Link href="/" data-ui-sound="click" title="ROLEWISE" className="flex items-center min-w-0 w-[180px] h-10">
                <RolewiseLogo className="block w-[180px] h-10 object-contain" />
              </Link>
              <button type="button" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close navigation" className="w-10 h-10 rounded-full border border-[#E6E0D7] flex items-center justify-center text-[#6B6259] hover:text-[#1A1714]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Responsive primary navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    data-ui-sound="click"
                    className={`flex items-center gap-3 min-h-11 rounded-[14px] px-3.5 text-sm font-semibold transition-all ${active ? 'bg-[#1A1714] text-[#FFFFFF]' : 'text-[#6B6259] hover:bg-[#FAF8F4] hover:text-[#1A1714]'}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <Link
                href="/settings"
                data-ui-sound="click"
                className={`flex items-center gap-3 min-h-11 rounded-[14px] px-3.5 text-sm font-semibold transition-all ${isNavActive('/settings') ? 'bg-[#1A1714] text-[#FFFFFF]' : 'text-[#6B6259] hover:bg-[#FAF8F4] hover:text-[#1A1714]'}`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Settings</span>
              </Link>
            </nav>

            <div className="p-3 border-t border-[#E6E0D7]">
              <Link href="/profile" data-ui-sound="click" className="flex items-center gap-3 px-2 py-2 mb-2 rounded-[14px] hover:bg-[#FAF8F4]">
                <Avatar name={userName} url={avatarUrl} className="w-9 h-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#1A1714] truncate">{userName || 'Candidate'}</p>
                  <p className="text-[10px] text-[#6B6259] truncate">{session.user?.email || 'Profile'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#6B6259] shrink-0" aria-hidden="true" />
              </Link>
              <button type="button" data-ui-sound="click" onClick={() => signOut()} className="w-full flex items-center gap-3 min-h-10 rounded-[13px] px-3.5 text-sm font-semibold text-[#6B6259] hover:bg-[#FFF0ED] hover:text-[#D97968]">
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        </div>

        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 bg-[#FAF8F4]/95 backdrop-blur-xl border-b border-[#E6E0D7]/75">
            <div className="px-4 sm:px-6 lg:px-7 py-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open navigation"
                title="Open navigation"
                data-ui-sound="click"
                className="lg:hidden inline-flex w-10 h-10 rounded-full border border-[#E6E0D7] bg-[#FFFFFF] items-center justify-center text-[#6B6259] hover:text-[#1A1714] transition-all duration-200 shrink-0"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className={`${pathname === '/jobs' || pathname.startsWith('/find-jobs') ? 'hidden' : 'hidden sm:flex'} items-center gap-2 w-full max-w-md h-10 px-3 rounded-full bg-[#FFFFFF] border border-[#E6E0D7] text-[#6B6259] focus-within:border-[#B8A93F] focus-within:ring-2 focus-within:ring-[#FFD84D]/20 transition-all`}>
                <Search className="w-3.5 h-3.5 shrink-0" />
                <form
                  role="search"
                  className="w-full"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = headerQuery.trim();
                    router.push(q ? `/jobs?q=${encodeURIComponent(q)}` : '/jobs');
                    setHeaderQuery('');
                  }}
                >
                  <label htmlFor="global-search" className="sr-only">Search your jobs</label>
                  <input
                    id="global-search"
                    type="search"
                    value={headerQuery}
                    onChange={(e) => setHeaderQuery(e.target.value)}
                    placeholder="Search jobs"
                    className="bg-transparent border-none outline-none w-full text-sm text-[#1A1714] placeholder:text-[#9A9086]"
                  />
                </form>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {/* Phones: the search box collapses to an icon so the header has room. */}
                {pathname !== '/jobs' && !pathname.startsWith('/find-jobs') && (
                  <Link href="/jobs" data-ui-sound="click" aria-label="Search your jobs" className="sm:hidden w-10 h-10 rounded-full border border-[#E6E0D7] bg-white flex items-center justify-center text-[#6B6259] hover:text-[#1A1714]">
                    <Search className="w-4 h-4" aria-hidden="true" />
                  </Link>
                )}
                {pathname !== '/' && pathname !== '/dashboard' && !pathname?.startsWith('/jobs') && (
                  <Link href="/jobs/new" data-ui-sound="click" aria-label="Add a job" className="touch-target inline-flex items-center gap-1.5 px-3.5 rounded-full bg-[#FFD84D] hover:bg-[#E7C43E] text-[#1A1714] text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0">
                    <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add a job</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => openRowi()}
                  aria-label="Chat with Rowi"
                  title="Chat with Rowi"
                  className="lg:hidden w-10 h-10 rounded-full border border-[#E6E0D7] bg-white flex items-center justify-center overflow-hidden hover:bg-[#FFFFFF] transition-colors"
                >
                  <Mascot size={30} track={false} animated={false} sound={false} interactive={false} />
                </button>
                <HeaderActions name={userName} email={session.user?.email || ''} avatarUrl={avatarUrl} onSignOut={() => signOut()} />
              </div>
            </div>
          </header>

          <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 pb-24 lg:pb-32">
            {children}
          </main>
        </div>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-[#FFFFFF]/95 backdrop-blur border-t border-[#E6E0D7] z-40 px-1 pt-1 pb-[max(4px,env(safe-area-inset-bottom))] flex items-center justify-around shadow-[0_-4px_18px_rgba(26,23,20,0.06)]" aria-label="Mobile bottom navigation">
          {[
            { ...navItems[0], label: 'Home' },
            { ...navItems[1], label: 'Jobs' },
            { ...navItems[3], label: 'Prep' },
            { ...navItems[4], label: 'Practice' },
            { ...navItems[2], label: 'Find' },
          ].map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.href);
            return (
              <Link key={item.label} href={item.href} data-ui-sound="click" className={`touch-target flex-1 flex flex-col items-center justify-center py-1 transition-colors ${active ? 'text-[#1A1714]' : 'text-[#6B6259]'}`}>
                <div className={`w-8 h-6 rounded-full flex items-center justify-center transition-all ${active ? 'bg-[#FFD84D]' : ''}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[11px] mt-0.5 ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
