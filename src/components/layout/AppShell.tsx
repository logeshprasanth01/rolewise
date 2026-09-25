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
    if (href === '/') return pathname === '/' || pathname === '/dashboard';
    if (href === '/jobs') return pathname === '/jobs' || pathname.startsWith('/jobs/new');
    if (href === '/roles') return pathname.includes('/interview');
    return pathname?.startsWith(href);
  };

  useEffect(() => {
    if (!isLoading && !session && pathname !== '/auth' && !pathname?.startsWith('/auth/')) {
      router.replace('/auth');
    }
  }, [isLoading, session, pathname, router]);



  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#AEB4C0] flex flex-col items-center justify-center gap-3 text-[#73757A]">
        <div className="w-11 h-11 rounded-2xl bg-[#FFD84D] text-[#252525] flex items-center justify-center font-bold text-lg shadow-sm animate-pulse">
          R
        </div>
        <p className="text-xs font-medium tracking-wide">Loading ROLEWISE workspace...</p>
      </div>
    );
  }

  if (!session) {
    if (pathname?.startsWith('/auth/callback')) {
      return <>{children}</>;
    }
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-[#AEB4C0] text-[#252525] font-sans px-0 md:px-3 lg:px-5 py-0 md:py-3 lg:py-5">
      <div className="min-h-[calc(100vh-1.5rem)] lg:min-h-[calc(100vh-2.5rem)] bg-[#F3F2EE] md:rounded-[30px] lg:rounded-[34px] border border-[#D9D8D2] overflow-hidden flex flex-col shadow-[0_8px_30px_rgba(37,37,37,0.08)]">

        {/* DESKTOP / TABLET APPLICATION HEADER */}
        <header className="sticky top-0 z-30 bg-[#F3F2EE]/95 backdrop-blur-md border-b border-[#D9D8D2]">
          <div className="px-4 sm:px-6 lg:px-7 py-3.5 flex items-center gap-3 lg:gap-5">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-[13px] bg-[#252525] text-[#FFD84D] flex items-center justify-center font-bold text-base">
                R
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-[15px] tracking-tight text-[#252525]">ROLEWISE</span>
                <span className="block text-[9px] uppercase tracking-[0.14em] text-[#73757A] leading-none mt-0.5">Interview workspace</span>
              </div>
            </Link>

            <nav className="hidden lg:flex flex-1 min-w-0 px-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Primary navigation">
              <div className="flex items-center gap-1 p-1 bg-[#E7E7EE] rounded-full border border-[#D9D8D2] mx-auto whitespace-nowrap">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(item.href);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`min-h-10 px-2.5 xl:px-3 rounded-full inline-flex items-center gap-1.5 text-[11px] xl:text-xs font-semibold transition-all whitespace-nowrap ${
                        active
                          ? 'bg-[#FAF9F4] text-[#252525] shadow-sm border border-[#D9D8D2]'
                          : 'text-[#73757A] hover:text-[#252525] hover:bg-[#F3F2EE]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden xl:flex items-center gap-2 w-48 h-10 px-3 rounded-full bg-[#FAF9F4] border border-[#D9D8D2] text-[#73757A]">
                <Search className="w-3.5 h-3.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent border-none outline-none w-full text-xs text-[#252525] placeholder:text-[#9A9B9E]"
                />
                <kbd className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-[#F3F2EE] border border-[#D9D8D2]">⌘K</kbd>
              </div>

              {pathname !== '/jobs' && pathname !== '/jobs/' && (
                <Link
                  href="/jobs/new"
                  className="touch-target inline-flex items-center gap-1.5 px-3.5 rounded-full bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-xs font-bold transition-colors border border-[#E2C33F]"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Job</span>
                </Link>
              )}

              <button
                title="Notifications"
                className="w-10 h-10 rounded-full border border-[#D9D8D2] bg-[#FAF9F4] flex items-center justify-center text-[#73757A] hover:text-[#252525] hover:bg-[#FFFBEF] transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#D97968] absolute top-2.5 right-2.5" />
              </button>

              <div className="relative" onClick={(event) => event.stopPropagation()}>
                <button
                  onClick={() => setIsUserMenuOpen((value) => !value)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-[#E7E7EE] transition-colors"
                  aria-expanded={isUserMenuOpen}
                  aria-label="Open profile menu"
                >
                  <div className="w-9 h-9 rounded-full bg-[#252525] text-[#FFD84D] font-bold text-xs flex items-center justify-center">
                    {userName ? userName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden lg:inline text-xs font-semibold text-[#252525] max-w-20 truncate">
                    {userName ? userName.split(' ')[0] : 'Candidate'}
                  </span>
                  <ChevronDown className="hidden lg:block w-3.5 h-3.5 text-[#73757A]" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-12 w-52 rounded-2xl bg-[#FAF9F4] border border-[#D9D8D2] shadow-[0_12px_30px_rgba(37,37,37,0.12)] py-1.5 z-50">
                    <div className="px-3.5 py-3 border-b border-[#D9D8D2]">
                      <p className="text-xs font-semibold text-[#252525]">{userName || 'Candidate'}</p>
                      <p className="text-[11px] text-[#73757A] truncate mt-0.5">{session.user?.email || ''}</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-[#252525] hover:bg-[#F3F2EE]"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#73757A]" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-[#D97968] hover:bg-[#FFF0ED] text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TABLET NAV */}
          <div className="lg:hidden px-4 sm:px-6 pb-3 overflow-x-auto">
            <nav className="flex items-center gap-1.5 min-w-max" aria-label="Tablet navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`min-h-10 px-3.5 rounded-full inline-flex items-center gap-2 text-xs font-semibold whitespace-nowrap border transition-all ${
                      active
                        ? 'bg-[#252525] text-[#FFD84D] border-[#252525]'
                        : 'bg-[#FAF9F4] text-[#73757A] border-[#D9D8D2] hover:text-[#252525]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {/* MAIN PAGE VIEW */}
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 pb-24 md:pb-12">
          {children}
        </main>

        {/* MOBILE BOTTOM NAVIGATION */}
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 bg-[#FAF9F4]/95 backdrop-blur border-t border-[#D9D8D2] z-40 px-1 py-1 flex items-center justify-around shadow-[0_-4px_18px_rgba(37,37,37,0.06)]"
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
                  active ? 'text-[#252525]' : 'text-[#73757A]'
                }`}
              >
                <div
                  className={`w-8 h-6 rounded-full flex items-center justify-center transition-colors ${
                    active ? 'bg-[#FFD84D]' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] mt-0.5 ${active ? 'font-bold' : 'font-medium'}`}>
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
