'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronRight, LogOut, Settings, User, X } from 'lucide-react';

type Panel = 'none' | 'notifications' | 'account';

/**
 * Top-right header controls: the notifications bell (opens a panel; empty state for now)
 * and the profile avatar (opens a small account menu). One panel open at a time;
 * Esc, a click outside, or the trigger again closes it.
 */
export function HeaderActions({
  name,
  email,
  avatarUrl,
  onSignOut,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState<Panel>('none');
  const rootRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const accountPanelRef = useRef<HTMLDivElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const accountBtnRef = useRef<HTMLButtonElement>(null);
  const notifId = useId();
  const accountId = useId();

  useEffect(() => {
    if (open === 'none') return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen('none');
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const trigger = open === 'notifications' ? notifBtnRef.current : accountBtnRef.current;
      setOpen('none');
      trigger?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    // Move focus into the panel so keyboard and screen-reader users land on it.
    const panel = open === 'notifications' ? notifPanelRef.current : accountPanelRef.current;
    panel?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (panel: Panel) => setOpen((cur) => (cur === panel ? 'none' : panel));
  const close = () => setOpen('none');

  return (
    <div ref={rootRef} className="flex items-center gap-2">
      {/* Notifications */}
      <div className="relative">
        <button
          ref={notifBtnRef}
          type="button"
          data-ui-sound="click"
          onClick={() => toggle('notifications')}
          aria-label="Notifications"
          aria-haspopup="dialog"
          aria-expanded={open === 'notifications'}
          aria-controls={notifId}
          className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer ${
            open === 'notifications'
              ? 'bg-[#1A1714] border-[#1A1714] text-white'
              : 'bg-white border-[#E6E0D7] text-[#6B6259] hover:text-[#1A1714] hover:-translate-y-0.5'
          }`}
        >
          <Bell className="w-4 h-4" aria-hidden="true" />
        </button>

        {open === 'notifications' && (
          <div
            ref={notifPanelRef}
            id={notifId}
            role="dialog"
            aria-label="Notifications"
            className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[360px] z-50 rounded-2xl bg-white border border-[#E6E0D7] shadow-[0_18px_48px_rgba(26,23,20,0.14)] overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-150"
          >
            <div className="flex items-center justify-between pl-4 pr-2 h-12 border-b border-[#F0ECE6]">
              <h2 className="text-sm font-bold text-[#1A1714]">Notifications</h2>
              <button
                type="button"
                data-autofocus
                onClick={() => {
                  close();
                  notifBtnRef.current?.focus();
                }}
                aria-label="Close notifications"
                className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#6B6259] hover:bg-[#F3EFE9] hover:text-[#1A1714] cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Empty state */}
            <div className="px-6 pt-8 pb-9 text-center">
              <div className="relative mx-auto w-16 h-16" aria-hidden="true">
                <span className="absolute inset-0 rounded-full bg-[#FFF4CC]" />
                <span className="absolute inset-[9px] rounded-full bg-white border border-[#F0D77A] flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#8A5A12]" />
                </span>
              </div>
              <p className="mt-4 text-[15px] font-bold text-[#1A1714]">No new notifications</p>
              <p className="mt-1 text-xs leading-relaxed text-[#6B6259] max-w-[250px] mx-auto">
                You&apos;re all caught up. Updates on your applications will show up here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="relative">
        <button
          ref={accountBtnRef}
          type="button"
          data-ui-sound="click"
          onClick={() => toggle('account')}
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={open === 'account'}
          aria-controls={accountId}
          className={`w-10 h-10 rounded-full p-[2px] transition-all duration-200 cursor-pointer ${
            open === 'account' ? 'bg-[#1A1714]' : 'bg-[#E6E0D7] hover:bg-[#CFC7BC] hover:-translate-y-0.5'
          }`}
        >
          <Avatar name={name} url={avatarUrl} className="w-full h-full text-xs" />
        </button>

        {open === 'account' && (
          <div
            ref={accountPanelRef}
            id={accountId}
            role="menu"
            aria-label="Account"
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-[272px] rounded-2xl bg-white border border-[#E6E0D7] shadow-[0_18px_48px_rgba(26,23,20,0.14)] p-1.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-150"
          >
            <div className="flex items-center gap-3 px-2.5 py-2.5 mb-1 border-b border-[#F0ECE6]">
              <Avatar name={name} url={avatarUrl} className="w-10 h-10 text-sm" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1A1714] truncate">{name || 'Candidate'}</p>
                <p className="text-[11px] text-[#6B6259] truncate">{email}</p>
              </div>
            </div>
            <MenuLink href="/profile" icon={User} label="My profile" onPick={close} autofocus />
            <MenuLink href="/settings" icon={Settings} label="Settings" onPick={close} />
            <button
              type="button"
              role="menuitem"
              data-ui-sound="click"
              onClick={() => {
                close();
                onSignOut();
              }}
              className="w-full flex items-center gap-3 h-10 px-2.5 rounded-xl text-sm font-semibold text-[#6B6259] hover:bg-[#FFF0ED] hover:text-[#C25E4D] cursor-pointer"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onPick,
  autofocus,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  onPick: () => void;
  autofocus?: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      data-ui-sound="click"
      data-autofocus={autofocus || undefined}
      onClick={onPick}
      className="flex items-center gap-3 h-10 px-2.5 rounded-xl text-sm font-semibold text-[#1A1714] hover:bg-[#F3EFE9]"
    >
      <Icon className="w-4 h-4 text-[#6B6259]" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="w-4 h-4 text-[#B5ADA3]" aria-hidden="true" />
    </Link>
  );
}

/** Round photo, or the first letter of the name when there's no photo (or it fails to load). */
export function Avatar({ name, url, className = '' }: { name: string; url: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || 'U').trim().charAt(0).toUpperCase() || 'U';
  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`rounded-full object-cover bg-[#F3EFE9] shrink-0 ${className}`}
      />
    );
  }
  return (
    <span aria-hidden="true" className={`rounded-full bg-[#1A1714] text-white font-bold flex items-center justify-center shrink-0 ${className}`}>
      {initial}
    </span>
  );
}
