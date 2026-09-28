'use client';

// Vercel build refresh: AppShell JSX validated

import React, { useEffect, useRef, useState } from 'react';
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
  UserRound,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthView } from '@/components/auth/AuthView';
import { playUiSound } from '@/lib/ui-sound';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { userName, session, isLoading, signOut } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'My Jobs', href: '/jobs', icon: Briefcase },
    { label: 'Preparation', href: '/preparation', icon: Layers },
    { label: 'AI Interview', href: '/roles', icon: Bot },
    { label: 'Communication', href: '/communication-practice', icon: MessageSquare },
    { label: 'Feedback', href: '/feedback', icon: Clock },
    { label: 'Resume', href: '/resume', icon: FileText },
  ];

  const isNavActive = (href: string) => {
    const isPreparationRoute =
      pathname === '/preparation' ||
      pathname?.startsWith('/preparation/') ||
      pathname?.includes('/preparation');

    if (href === '/') return pathname === '/' || pathname === '/dashboard';
    if (href === '/jobs') return pathname === '/jobs' || pathname.startsWith('/jobs/new');
    if (href === '/preparation') return isPreparationRoute;
    if (href === '/roles') return pathname.startsWith('/roles') && !isPreparationRoute;
    return pathname?.startsWith(href);
  };

  useEffect(() => {
    if (!isLoading && !session && pathname !== '/auth' && !pathname?.startsWith('/auth/')) {
      router.replace('/auth');
    }
  }, [isLoading, session, pathname, router]);

  useEffect(() => {
    const saved = window.localStorage.getItem('rolewise-sidebar-collapsed');
    if (saved === 'true') setIsSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('rolewise-sidebar-collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    setIsProfileOpen(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#AEB4C0] flex flex-col items-center justify-center gap-3 text-[#73757A]">
        <div className="w-11 h-11 rounded-2xl bg-[#FFD84D] text-[#252525] flex items-center justify-center font-bold text-lg shadow-sm animate-pulse">R</div>
        <p className="text-xs font-medium tracking-wide">Loading ROLEWISE workspace...</p>
      </div>
    );
  }

  if (!session) {
    if (pathname?.startsWith('/auth/callback')) return <>{children}</>;
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-[#F3F2EE] text-[#252525] font-sans">
      <div className="min-h-screen w-full bg-[#F3F2EE] flex min-w-0">

        <aside
          className={`hidden lg:flex shrink-0 bg-[#FAF9F4] border-r border-[#D9D8D2] flex-col z-40 transition-[width] duration-300 ease-out ${isSidebarCollapsed ? 'w-[76px]' : 'w-[232px]'}`}
          aria-label="Sidebar navigation"
        >
          <div className={`p-3 ${isSidebarCollapsed ? 'lg:p-3' : 'lg:p-5'} border-b border-[#D9D8D2]/70`}>
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
              <Link
                href="/"
                data-ui-sound="click"
                title={isSidebarCollapsed ? 'ROLEWISE' : undefined}
                className="flex items-center gap-3 group min-w-0"
              >
                <div className="w-10 h-10 rounded-[14px] bg-[#252525] text-[#FFFFFF] flex items-center justify-center font-bold text-base transition-transform duration-200 group-hover:scale-[1.04] shrink-0">
                  R
                </div>
                {!isSidebarCollapsed && (
                  <div className="min-w-0">
                    <span className="font-bold text-[15px] tracking-tight text-[#252525] whitespace-nowrap">ROLEWISE</span>
                    <span className="block text-[9px] uppercase tracking-[0.14em] text-[#73757A] leading-none mt-0.5 whitespace-nowrap">Interview workspace</span>
                  </div>
                )}
              </Link>

              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
                title={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
                data-ui-sound="click"
                className={`w-9 h-9 rounded-full border border-[#D9D8D2] bg-[#F3F2EE] flex items-center justify-center text-[#73757A] hover:text-[#252525] hover:bg-[#FFFBEF] transition-all duration-200 shrink-0 ${isSidebarCollapsed ? 'hidden' : ''}`}
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>

              {isSidebarCollapsed && (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Open sidebar"
                  title="Open sidebar"
                  data-ui-sound="click"
                  className="w-10 h-10 rounded-[14px] border border-[#D9D8D2] bg-[#252525] text-[#FFFFFF] flex items-center justify-center hover:opacity-90 transition-all duration-200 shrink-0"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <nav className="px-2 lg:px-3 space-y-1 flex-1 overflow-y-auto" aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={isSidebarCollapsed ? item.label : undefined}
                  data-ui-sound="click"
                  className={`group flex items-center gap-3 min-h-11 rounded-[14px] px-3 lg:px-3.5 text-xs font-semibold transition-all duration-200 ${isSidebarCollapsed ? 'justify-center' : ''} ${active ? 'bg-[#252525] text-[#FFFFFF] border border-[#252525] shadow-[0_4px_12px_rgba(37,37,37,0.12)]' : 'text-[#73757A] hover:bg-[#F3F2EE] hover:text-[#252525]'}`}
                >
                  <Icon className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="p-2 lg:p-3 space-y-2 border-t border-[#D9D8D2]">
            <Link
              href="/settings"
              title={isSidebarCollapsed ? 'Settings' : undefined}
              data-ui-sound="click"
              className={`flex items-center gap-3 min-h-11 rounded-[14px] px-3 lg:px-3.5 text-xs font-semibold transition-all ${isSidebarCollapsed ? 'justify-center' : ''} ${isNavActive('/settings') ? 'bg-[#252525] text-[#FFFFFF] border border-[#252525]' : 'text-[#73757A] hover:bg-[#F3F2EE] hover:text-[#252525]'}`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Settings</span>}
            </Link>

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen((value) => !value)}
                title="Profile"
                aria-expanded={isProfileOpen}
                className={`w-full flex items-center gap-3 min-h-12 rounded-[15px] px-2.5 lg:px-3 bg-[#F3F2EE] border border-[#D9D8D2] hover:border-[#C9C7BE] transition-all duration-200 ${isSidebarCollapsed ? 'justify-center' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-[#252525] text-[#FFFFFF] font-bold text-xs flex items-center justify-center shrink-0">
                  {userName ? userName[0].toUpperCase() : 'U'}
                </div>
                {!isSidebarCollapsed && (
                  <div className="min-w-0 text-left flex-1">
                    <p className="text-xs font-bold text-[#252525] truncate">{userName || 'Candidate'}</p>
                    <p className="text-[10px] text-[#73757A] truncate">{session.user?.email || 'Profile'}</p>
                  </div>
                )}
                {!isSidebarCollapsed && (
                  <ChevronDown className={`w-3.5 h-3.5 text-[#73757A] transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {isProfileOpen && (
                <div className="absolute left-0 right-0 md:left-[calc(100%+8px)] md:right-auto bottom-14 md:bottom-0 w-56 rounded-2xl bg-[#FAF9F4] border border-[#D9D8D2] shadow-[0_14px_35px_rgba(37,37,37,0.16)] p-1.5 z-50 animate-rw-pop">
                  <Link href="/profile" data-ui-sound="click" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#252525] hover:bg-[#F3F2EE]">
                    <UserRound className="w-4 h-4 text-[#73757A]" /> Profile
                  </Link>
                  <Link href="/settings" data-ui-sound="click" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#252525] hover:bg-[#F3F2EE]">
                    <Settings className="w-4 h-4 text-[#73757A]" /> Settings
                  </Link>
                  <button
                    type="button"
                    data-ui-sound="click"
                    onClick={() => { setIsProfileOpen(false); signOut(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#D97968] hover:bg-[#FFF0ED] text-left"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              data-ui-sound="click"
              onClick={() => signOut()}
              title="Sign out"
              className={`w-full flex items-center gap-3 min-h-10 rounded-[13px] px-3.5 text-xs font-semibold text-[#73757A] hover:bg-[#FFF0ED] hover:text-[#D97968] transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Sign out</span>}
            </button>
          </div>
        </aside>

        <div className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-200 ${isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`} aria-hidden={!isMobileMenuOpen}>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-[#252525]/25 backdrop-blur-[2px]"
          />
          <aside
            className={`absolute left-0 top-0 bottom-0 w-[min(86vw,320px)] bg-[#FAF9F4] border-r border-[#D9D8D2] shadow-[12px_0_35px_rgba(37,37,37,0.14)] flex flex-col transition-transform duration-200 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            aria-label="Responsive navigation"
          >
            <div className="p-4 border-b border-[#D9D8D2] flex items-center justify-between">
              <Link href="/" data-ui-sound="click" className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-[14px] bg-[#252525] text-[#FFFFFF] flex items-center justify-center font-bold shrink-0">R</div>
                <div className="min-w-0">
                  <span className="font-bold text-[15px] tracking-tight text-[#252525]">ROLEWISE</span>
                  <span className="block text-[9px] uppercase tracking-[0.14em] text-[#73757A] leading-none mt-0.5">Interview workspace</span>
                </div>
              </Link>
              <button type="button" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close navigation" className="w-10 h-10 rounded-full border border-[#D9D8D2] flex items-center justify-center text-[#73757A] hover:text-[#252525]">
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
                    className={`flex items-center gap-3 min-h-11 rounded-[14px] px-3.5 text-sm font-semibold transition-all ${active ? 'bg-[#252525] text-[#FFFFFF]' : 'text-[#73757A] hover:bg-[#F3F2EE] hover:text-[#252525]'}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <Link
                href="/settings"
                data-ui-sound="click"
                className={`flex items-center gap-3 min-h-11 rounded-[14px] px-3.5 text-sm font-semibold transition-all ${isNavActive('/settings') ? 'bg-[#252525] text-[#FFFFFF]' : 'text-[#73757A] hover:bg-[#F3F2EE] hover:text-[#252525]'}`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Settings</span>
              </Link>
            </nav>

            <div className="p-3 border-t border-[#D9D8D2]">
              <div className="flex items-center gap-3 px-2 py-2 mb-2">
                <div className="w-9 h-9 rounded-full bg-[#252525] text-[#FFFFFF] font-bold text-xs flex items-center justify-center shrink-0">
                  {userName ? userName[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#252525] truncate">{userName || 'Candidate'}</p>
                  <p className="text-[10px] text-[#73757A] truncate">{session.user?.email || 'Profile'}</p>
                </div>
              </div>
              <button type="button" data-ui-sound="click" onClick={() => signOut()} className="w-full flex items-center gap-3 min-h-10 rounded-[13px] px-3.5 text-sm font-semibold text-[#73757A] hover:bg-[#FFF0ED] hover:text-[#D97968]">
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        </div>

        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 bg-[#F3F2EE]/95 backdrop-blur-xl border-b border-[#D9D8D2]/75">
            <div className="px-4 sm:px-6 lg:px-7 py-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open navigation"
                title="Open navigation"
                data-ui-sound="click"
                className="lg:hidden inline-flex w-10 h-10 rounded-full border border-[#D9D8D2] bg-[#FAF9F4] items-center justify-center text-[#73757A] hover:text-[#252525] transition-all duration-200 shrink-0"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 w-full max-w-md h-10 px-3 rounded-full bg-[#FAF9F4] border border-[#D9D8D2] text-[#73757A] focus-within:border-[#B8A93F] focus-within:ring-2 focus-within:ring-[#FFD84D]/20 transition-all">
                <Search className="w-3.5 h-3.5 shrink-0" />
                <input type="text" placeholder="Search jobs, interviews, or topics..." className="bg-transparent border-none outline-none w-full text-xs text-[#252525] placeholder:text-[#9A9B9E]" />
                <kbd className="hidden sm:inline text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-[#F3F2EE] border border-[#D9D8D2]">⌘K</kbd>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {pathname !== '/jobs' && pathname !== '/jobs/' && (
                  <Link href="/jobs/new" data-ui-sound="click" className="touch-target inline-flex items-center gap-1.5 px-3.5 rounded-full bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0">
                    <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Job</span>
                  </Link>
                )}
                <button type="button" title="Notifications" data-ui-sound="click" className="w-10 h-10 rounded-full border border-[#D9D8D2] bg-[#FAF9F4] flex items-center justify-center text-[#73757A] hover:text-[#252525] hover:bg-[#FFFBEF] transition-all duration-200 hover:-translate-y-0.5 relative">
                  <Bell className="w-4 h-4" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97968] absolute top-2.5 right-2.5" />
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 pb-24 lg:pb-12">
            {children}
          </main>
        </div>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-[#FAF9F4]/95 backdrop-blur border-t border-[#D9D8D2] z-40 px-1 py-1 flex items-center justify-around shadow-[0_-4px_18px_rgba(37,37,37,0.06)]" aria-label="Mobile bottom navigation">
          {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[6]].map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.href);
            return (
              <Link key={item.label} href={item.href} data-ui-sound="click" className={`touch-target flex-1 flex flex-col items-center justify-center py-1 transition-colors ${active ? 'text-[#252525]' : 'text-[#73757A]'}`}>
                <div className={`w-8 h-6 rounded-full flex items-center justify-center transition-all ${active ? 'bg-[#FFD84D]' : ''}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] mt-0.5 ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
