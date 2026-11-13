'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUp, Volume2, VolumeX, X } from 'lucide-react';
import { Mascot } from '@/components/brand/Mascot';
import { matchHelp, SUGGESTIONS, type HelpLink } from '@/lib/assistant-kb';
import { isMascotSoundOn, playMascotSound, setMascotSoundOn } from '@/lib/mascot-sound';
import { ROWI_OPEN_EVENT } from '@/lib/rowi-events';

type ChatMsg = { role: 'user' | 'assistant'; content: string; link?: HelpLink };

const GREETING: ChatMsg = {
  role: 'assistant',
  content: "Hi, I'm Rowi, your Rolewise prep buddy! Ask me anything about using Rolewise or getting ready for an interview.",
};

const FALLBACK =
  "I'm not sure about that one yet. I can help with adding a job, your resume, the fit score, your prep plan, mock interviews and voice or video practice.";

export function MascotAssistant() {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [hint, setHint] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // Public pages have no bottom nav; inside the app on small screens, sit above it.
  const isPublic = pathname.startsWith('/welcome') || pathname.startsWith('/auth');
  const offset = isPublic ? 'bottom-5' : 'bottom-[88px] lg:bottom-6';

  useEffect(() => {
    const id = requestAnimationFrame(() => setSoundOn(isMascotSoundOn()));
    let seen = false;
    try {
      seen = window.sessionStorage.getItem('rolewise-helper-hint') === '1';
    } catch {
      /* ignore */
    }
    const t = seen ? undefined : window.setTimeout(() => setHint(true), 4000);
    return () => {
      cancelAnimationFrame(id);
      if (t) window.clearTimeout(t);
    };
  }, []);

  // Other parts of the page can open the chat (and ask a question) via openRowi().
  const askRef = useRef<(q: string) => void>(() => {});
  useEffect(() => {
    const onOpen = (e: Event) => {
      const q = (e as CustomEvent<{ question?: string }>).detail?.question;
      setHint(false);
      playMascotSound('open');
      setOpen(true);
      if (q) window.setTimeout(() => askRef.current(q), 250);
    };
    window.addEventListener(ROWI_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ROWI_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, busy]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const dismissHint = () => {
    setHint(false);
    try {
      window.sessionStorage.setItem('rolewise-helper-hint', '1');
    } catch {
      /* ignore */
    }
  };

  const toggle = () => {
    dismissHint();
    playMascotSound(open ? 'close' : 'open');
    setOpen(!open);
  };

  function close() {
    playMascotSound('close');
    setOpen(false);
    launcherRef.current?.focus();
  }

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setMascotSoundOn(next);
    if (next) playMascotSound('boop');
  };

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history = [...msgs, { role: 'user' as const, content: q }];
    setMsgs(history);
    setInput('');
    setBusy(true);
    playMascotSound('send');

    const local = matchHelp(q);
    let reply: ChatMsg | null = null;
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.filter((m) => m !== GREETING).map(({ role, content }) => ({ role, content })) }),
      });
      if (res.ok) {
        const data = (await res.json()) as { reply?: string };
        if (data.reply) reply = { role: 'assistant', content: data.reply, link: local?.link };
      }
    } catch {
      // fall back to built-in help below
    }
    if (!reply) {
      await new Promise((r) => setTimeout(r, 450)); // a beat so the reply doesn't feel abrupt
      reply = local ? { role: 'assistant', content: local.answer, link: local.link } : { role: 'assistant', content: FALLBACK };
    }
    setMsgs((m) => [...m, reply!]);
    setBusy(false);
    playMascotSound('reply');
  }

  useEffect(() => {
    askRef.current = (q: string) => void ask(q);
  });

  const showSuggestions = msgs.length === 1 && !busy;

  return (
    <div className={`fixed right-4 z-[70] sm:right-6 ${offset}`}>
      {open && (
        <section
          role="dialog"
          aria-label="Chat with Rowi"
          className="rw-assistant-panel absolute bottom-[84px] right-0 flex h-[min(560px,calc(100dvh-140px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-[24px] border border-[#E4E2DA] bg-[#FAF9F4] text-[#252525] shadow-[0_30px_80px_-20px_rgba(37,37,37,0.45)]"
        >
          <header className="flex items-center gap-3 bg-[#252525] px-4 py-3 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
              <Mascot size={34} track={false} animated={false} interactive={false} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">Rowi</p>
              <p className="text-[12px] text-white/60">Your Rolewise prep buddy</p>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundOn}
              aria-label={soundOn ? 'Mute sounds' : 'Turn sounds on'}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD84D]"
            >
              {soundOn ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Close chat with Rowi"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD84D]"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {msgs.map((m, i) =>
              m.role === 'assistant' ? (
                <div key={i} className="flex items-end gap-2">
                  <span className="mb-0.5 shrink-0">
                    <Mascot size={26} track={false} animated={false} interactive={false} />
                  </span>
                  <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-[#E4E2DA] bg-white px-3.5 py-2.5 text-[14px] leading-relaxed">
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.link && (
                      <Link
                        href={m.link.href}
                        onClick={() => setOpen(false)}
                        className="mt-2 inline-flex min-h-[32px] items-center rounded-full bg-[#FFD84D] px-3 text-[13px] font-semibold text-[#252525] hover:bg-[#FFE27A]"
                      >
                        {m.link.label}
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[#252525] px-3.5 py-2.5 text-[14px] leading-relaxed text-white">
                    {m.content}
                  </p>
                </div>
              )
            )}
            {busy && (
              <div className="flex items-end gap-2" aria-label="Rowi is typing">
                <Mascot size={26} track={false} animated={false} interactive={false} />
                <div className="flex gap-1 rounded-2xl rounded-bl-md border border-[#E4E2DA] bg-white px-3.5 py-3">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="rw-typing-dot h-2 w-2 rounded-full bg-[#D49A35]" style={{ animationDelay: `${d * 150}ms` }} />
                  ))}
                </div>
              </div>
            )}
            {showSuggestions && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="min-h-[36px] rounded-full border border-[#D9D8D2] bg-white px-3 text-[13px] font-medium text-[#3A3C40] hover:border-[#252525]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
            className="flex items-center gap-2 border-t border-[#E4E2DA] bg-white p-3"
          >
            <label htmlFor="rw-assistant-input" className="sr-only">
              Ask Rowi
            </label>
            <input
              id="rw-assistant-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={600}
              placeholder="Ask Rowi anything…"
              autoComplete="off"
              className="h-11 min-w-0 flex-1 rounded-full border border-[#D9D8D2] bg-[#FAF9F4] px-4 text-[14px] outline-none placeholder:text-[#8A8C91] focus:border-[#252525]/50 focus:ring-2 focus:ring-[#FFD84D]/40"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              aria-label="Send"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFD84D] text-[#252525] transition hover:bg-[#FFE27A] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525]"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </form>
        </section>
      )}

      {hint && !open && (
        <div className="rw-assistant-hint absolute bottom-[78px] right-0 flex w-max max-w-[240px] items-start gap-1 rounded-2xl rounded-br-md border border-[#E4E2DA] bg-white py-1 pl-1 pr-1 shadow-[0_14px_30px_-14px_rgba(37,37,37,0.4)]">
          <button
            type="button"
            onClick={toggle}
            className="rounded-xl px-2.5 py-1.5 text-left text-[13px] font-medium text-[#252525] hover:bg-[#F3F2EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525]"
          >
            Hi, I&apos;m Rowi! Need a hand?
          </button>
          <button
            type="button"
            onClick={dismissHint}
            aria-label="Dismiss"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#73757A] hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525]"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}

      {/* Launcher: fixed in place; the mascot reacts but the button never moves. */}
      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        onPointerEnter={() => {
          if (!open) playMascotSound('hello');
        }}
        aria-expanded={open}
        aria-label={open ? 'Close chat with Rowi' : 'Chat with Rowi'}
        className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full border border-[#E4E2DA] bg-white shadow-[0_14px_34px_-12px_rgba(37,37,37,0.45)] transition-shadow hover:shadow-[0_18px_40px_-12px_rgba(37,37,37,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525] focus-visible:ring-offset-2"
      >
        <Mascot size={52} animated={false} sound={false} />
        {!open && <span className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white bg-[#6FA77F]" aria-hidden />}
      </button>
    </div>
  );
}
