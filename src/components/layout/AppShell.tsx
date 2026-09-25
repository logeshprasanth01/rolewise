'use client';

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
  const { user, userName, session, isLoading, signOut } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

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
    if (href === '/') return pathname === '/' || pathname === '/dashboard';
    if (href === '/jobs') return pathname === '/jobs' || pathname.startsWith('/jobs/new');
    if (href === '/roles') return pathname.startsWith('/roles');
    if (href === '/preparation') return pathname.startsWith('/preparation') || pathname.includes('/preparation');
    return pathname?.startsWith(href);
  };

  useEffect(() => {
    if (!isLoading && !session && pathname !== '/auth' && !pathname?.startsWith('/auth/')) {
      router.replace('/auth');
    }
  }, [isLoading, session, pathname, router]);

  useEffect(() => {
    const readAccessibilityPreference = () => {
      setAccessibilityEnabled(window.localStorage.getItem('rolewise-accessibility-enabled-v2') === 'true');
    };

    readAccessibilityPreference();
    window.addEventListener('rolewise-accessibility-change', readAccessibilityPreference);
    window.addEventListener('storage', readAccessibilityPreference);
    return () => {
      window.removeEventListener('rolewise-accessibility-change', readAccessibilityPreference);
      window.removeEventListener('storage', readAccessibilityPreference);
    };
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem('rolewise-sidebar-collapsed');
    if (stored === 'true') setIsSidebarCollapsed(true);
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
  }, [pathname]);

  useEffect(() => {
    const handleSidebarShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setIsSidebarCollapsed((value) => !value);
      }
    };
    document.addEventListener('keydown', handleSidebarShortcut);
    return () => document.removeEventListener('keydown', handleSidebarShortcut);
  }, []);

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

  useEffect(() => {
    const handleTouchStart = (event: TouchEvent) => {
      touchStartX.current = event.touches[0]?.clientX ?? null;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (touchStartX.current === null) return;

      const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
      const deltaX = endX - touchStartX.current;
      const startX = touchStartX.current;
      touchStartX.current = null;

      // Only treat horizontal gestures near the left app edge as sidebar gestures.
      if (startX > 280 && !isSidebarCollapsed) return;
      if (Math.abs(deltaX) < 60) return;

      if (deltaX < 0 && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      } else if (deltaX > 0 && isSidebarCollapsed && startX < 280) {
        setIsSidebarCollapsed(false);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isSidebarCollapsed]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#AEB4C0] flex flex-col items-center justify-center gap-3 text-[#73757A]">
        <img src="/rolewise-logo.svg" alt="ROLEWISE" width={176} height={37} className="w-[176px] h-auto animate-pulse" />
        <p className="text-xs font-medium tracking-wide">Loading ROLEWISE workspace...</p>
      </div>
    );
  }

  if (!session) {
    if (pathname?.startsWith('/auth/callback')) return <>{children}</>;
    return <AuthView />;
  }

  return (
    <>
      {accessibilityEnabled && <a href="#main-content" className="rw-skip-link">Skip to main content</a>}
      <div className="min-h-screen bg-[#F3F2EE] text-[#252525] font-sans">
      <div className="rw-app-frame min-h-screen w-full border-0 rounded-none overflow-hidden flex min-h-0 shadow-none">
        <aside
          className={`hidden md:flex shrink-0 bg-[#FAF9F4]/96 backdrop-blur-xl border-r border-[#D9D8D2] flex-col z-40 transition-[width] duration-300 ease-out overflow-hidden ${isSidebarCollapsed ? 'w-[76px]' : 'w-[232px]'}`}
          aria-label="Sidebar navigation"
        >
          <div className={`p-3 ${isSidebarCollapsed ? 'md:p-3' : 'md:p-5'}`}>
            <div className={`flex items-center gap-2 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
              {!isSidebarCollapsed && (
                <Link href="/" data-ui-sound="click" title="ROLEWISE" aria-label="ROLEWISE home" className="flex items-center min-w-0 flex-1 group">
                  <img
                    src="/rolewise-logo.svg"
                    alt="ROLEWISE"
                    width={176}
                    height={37}
                    draggable={false}
                    className="w-[176px] h-auto max-h-10 object-contain object-left transition-transform duration-200 group-hover:scale-[1.015]"
                  />
                </Link>
              )}
              <button type="button" data-ui-sound="click" onClick={() => setIsSidebarCollapsed((value) => !value)} title={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'} aria-label={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'} aria-expanded={!isSidebarCollapsed} aria-keyshortcuts="Control+B Meta+B" className={`w-9 h-9 flex items-center justify-center rounded-xl text-[#73757A] hover:text-[#5F6368] hover:bg-[#EAE9E4] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525] focus-visible:ring-offset-2 ${isSidebarCollapsed ? 'mx-auto' : ''}`}>
                {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <nav className="px-2 md:px-3 space-y-1 flex-1 overflow-y-auto" aria-label="Primary navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={item.label}
                  aria-current={active ? 'page' : undefined}
                  data-ui-sound="click"
                  className={`group flex items-center gap-3 min-h-11 rounded-[14px] px-3 md:px-3.5 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525] focus-visible:ring-offset-2 ${active ? 'bg-[#252525] text-[#8A8A8A] border border-[#252525]' : 'text-[#73757A] hover:bg-[#E8E7E2] hover:text-[#5F6368]'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${active ? 'text-[#8A8A8A]' : 'text-[#73757A] group-hover:text-[#5F6368]'}`} />
                  {!isSidebarCollapsed && <span className="inline truncate text-current">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="p-2 md:p-3 space-y-2 border-t border-[#D9D8D2]">
            <Link
              href="/settings"
              title="Settings"
              data-ui-sound="click"
              className={`flex items-center gap-3 min-h-11 rounded-[14px] px-3 md:px-3.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525] focus-visible:ring-offset-2 ${isNavActive('/settings') ? 'bg-[#252525] text-[#C7C7C7] border border-[#252525]' : 'text-[#73757A] hover:bg-[#E8E7E2] hover:text-[#3F4246]'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Settings className={`w-4 h-4 shrink-0 ${isNavActive('/settings') ? 'text-[#8A8A8A]' : 'text-[#73757A]'}`} />
              {!isSidebarCollapsed && <span className="inline text-current">Settings</span>}
            </Link>

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen((value) => !value)}
                title="Profile"
                aria-expanded={isProfileOpen}
                className="w-full flex items-center gap-3 min-h-12 rounded-[15px] px-2.5 lg:px-3 bg-[#F3F2EE] border border-[#D9D8D2] hover:border-[#A9A9A4] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525] focus-visible:ring-offset-2"
              >
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-[#D9D8D2] shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#252525] text-[#D8D8D8] font-bold text-xs flex items-center justify-center shrink-0">
                    {userName ? userName[0].toUpperCase() : 'U'}
                  </div>
                )}
                {!isSidebarCollapsed && (
                  <div className="block min-w-0 text-left flex-1">
                    <p className="text-xs font-bold text-[#252525] truncate">My account</p>
                    <p className="text-[10px] text-[#73757A] truncate">Account settings</p>
                  </div>
                )}
                {!isSidebarCollapsed && (
                  <ChevronDown className={`block w-3.5 h-3.5 text-[#73757A] transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
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

            <button type="button" data-ui-sound="click" onClick={() => signOut()} className="flex w-full items-center gap-3 min-h-10 rounded-[13px] px-3.5 text-xs font-semibold text-[#73757A] hover:bg-[#FFF0ED] hover:text-[#B84F3D] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525] focus-visible:ring-offset-2">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <header className="sticky top-0 z-30 bg-[#F3F2EE]/55 backdrop-blur-xl border-b border-[#D9D8D2]/75">
            <div className="px-4 sm:px-6 lg:px-7 py-3 flex items-center gap-3">
              <div className="rw-search-shell flex items-center gap-2 w-full max-w-md h-10 px-3 rounded-full bg-[#FAF9F4] border border-[#D9D8D2] text-[#73757A] transition-all">
                <Search className="w-3.5 h-3.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Search jobs, interviews, or topics..."
                  className="rw-search-input bg-transparent border-none w-full text-xs text-[#252525] placeholder:text-[#9A9B9E]"
                />
                <kbd className="hidden sm:inline text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-[#F3F2EE] border border-[#D9D8D2]">⌘K</kbd>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {pathname !== '/jobs' && pathname !== '/jobs/' && (
                  <Link href="/jobs/new" data-ui-sound="click" className="touch-target inline-flex items-center gap-1.5 px-3.5 rounded-full bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 rw-primary-action">
                    <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Job</span>
                  </Link>
                )}
                <button type="button" title="Notifications" data-ui-sound="click" className="w-10 h-10 rounded-full border border-[#D9D8D2] bg-[#FAF9F4] flex items-center justify-center text-[#73757A] hover:text-[#252525] hover:bg-[#FFFBEF] transition-all duration-200 hover:-translate-y-0.5 relative">
                  <Bell className="w-4 h-4" /><span className="w-1.5 h-1.5 rounded-full bg-[#D97968] absolute top-2.5 right-2.5" />
                </button>
              </div>
            </div>
          </header>

          <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 pb-24 md:pb-12 focus:outline-none">{children}</main>
        </div>

        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#FAF9F4]/95 backdrop-blur border-t border-[#D9D8D2] z-40 px-1 py-1 flex items-center justify-around shadow-[0_-4px_18px_rgba(37,37,37,0.06)]" aria-label="Mobile bottom navigation">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.href);
            return (
              <Link key={item.label} href={item.href} data-ui-sound="click" aria-current={active ? 'page' : undefined} className={`touch-target flex-1 flex flex-col items-center justify-center py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525] focus-visible:ring-inset ${active ? 'text-[#252525]' : 'text-[#5F6368]'}`}>
                <div className={`w-8 h-6 rounded-full flex items-center justify-center transition-all ${active ? 'bg-[#FFD84D]' : ''}`}><Icon className="w-4 h-4" /></div>
                <span className={`text-[10px] mt-0.5 ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
    </>
  );
};