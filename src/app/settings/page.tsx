'use client';

import React, { ChangeEvent, useEffect, useState } from 'react';
import {
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Mic,
  Video,
  Accessibility,
  Bell,
  Save,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { playUiSound } from '@/lib/ui-sound';

const ACCESSIBILITY_KEY = 'rolewise-accessibility-enabled-v2';
const REDUCED_MOTION_KEY = 'rolewise-reduced-motion';
const NOTIFICATIONS_KEY = 'rolewise-notifications';

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 text-left py-3 focus-visible:outline-none"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[#252525]">{label}</span>
        <span className="block text-xs text-[#73757A] mt-1 leading-relaxed">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${checked ? 'bg-[#252525]' : 'bg-[#D9D8D2]'}`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const { user, session, userName, signOut, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [micTested, setMicTested] = useState<boolean | null>(null);
  const [cameraTested, setCameraTested] = useState<boolean | null>(null);

  useEffect(() => {
    setName(user?.user_metadata?.full_name || user?.user_metadata?.name || userName || '');
    setEmail(user?.email || '');
    setAvatarUrl(user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null);

    const readBool = (key: string, fallback: boolean) => {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : value === 'true';
    };

    setAccessibilityEnabled(readBool(ACCESSIBILITY_KEY, false));
    setReducedMotion(readBool(REDUCED_MOTION_KEY, false));
    setNotificationsEnabled(readBool(NOTIFICATIONS_KEY, true));
  }, [user, userName]);

  useEffect(() => {
    if (accessibilityEnabled) {
      document.documentElement.dataset.accessibility = 'enhanced';
    } else {
      document.documentElement.removeAttribute('data-accessibility');
    }

    if (reducedMotion) {
      document.documentElement.dataset.reducedMotion = 'true';
    } else {
      document.documentElement.removeAttribute('data-reduced-motion');
    }

    window.localStorage.setItem(ACCESSIBILITY_KEY, String(accessibilityEnabled));
    window.localStorage.setItem(REDUCED_MOTION_KEY, String(reducedMotion));
    window.localStorage.setItem(NOTIFICATIONS_KEY, String(notificationsEnabled));
  }, [accessibilityEnabled, reducedMotion, notificationsEnabled]);

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileError('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Profile image must be 5 MB or smaller.');
      return;
    }

    const image = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      image.onload = () => {
        const size = 320;
        const scale = Math.min(size / image.width, size / image.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        setAvatarUrl(canvas.toDataURL('image/jpeg', 0.8));
        setProfileError('');
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setProfileError('Please enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setProfileError('Please enter a valid email address.');
      return;
    }

    setSavingProfile(true);
    setProfileMessage('');
    setProfileError('');

    const result = await updateProfile({
      fullName: name.trim(),
      email: email.trim(),
      avatarUrl,
    });

    setSavingProfile(false);

    if (result.error) {
      setProfileError(result.error.message || 'Could not update your profile.');
      return;
    }

    setProfileMessage(
      email.trim() !== (user?.email || '')
        ? 'Profile saved. Check your new email inbox to confirm the email change.'
        : 'Profile saved successfully.'
    );
    playUiSound('success');
  };

  const handleResetAccessibility = () => {
    setAccessibilityEnabled(true);
    setReducedMotion(false);
    setNotificationsEnabled(true);
    playUiSound('success');
  };

  const handleTestMic = async () => {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setMicTested(true);
      } else setMicTested(false);
    } catch {
      setMicTested(false);
    }
  };

  const handleTestCamera = async () => {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        setCameraTested(true);
      } else setCameraTested(false);
    } catch {
      setCameraTested(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300">
      <section className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#252525] tracking-tight">Settings</h1>
        <p className="text-xs sm:text-sm text-[#73757A]">
          Manage your profile, accessibility, practice permissions, and workspace preferences.
        </p>
      </section>

      <section className="rolewise-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-[#5F6368]" />
          <div>
            <h2 className="text-sm font-semibold text-[#252525]">Profile</h2>
            <p className="text-xs text-[#73757A]">Edit the information shown across your ROLEWISE workspace.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-20 h-20 rounded-2xl object-cover border border-[#D9D8D2]" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[#252525] text-[#E5E5E5] flex items-center justify-center font-bold text-2xl">
                {(name || 'U')[0].toUpperCase()}
              </div>
            )}
            <label
              htmlFor="profile-image"
              className="absolute -right-2 -bottom-2 w-9 h-9 rounded-full bg-[#FFD84D] text-[#252525] flex items-center justify-center border-2 border-[#FAF9F4] cursor-pointer hover:bg-[#E7C43E] transition-colors"
              title="Upload profile image"
            >
              <Upload className="w-4 h-4" />
              <span className="sr-only">Upload profile image</span>
            </label>
            <input id="profile-image" type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#5F6368]">Full name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="rw-input w-full rounded-xl border border-[#D9D8D2] bg-white px-3.5 py-2.5 text-sm text-[#252525] outline-none" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#5F6368]">Email address</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rw-input w-full rounded-xl border border-[#D9D8D2] bg-white px-3.5 py-2.5 text-sm text-[#252525] outline-none" />
            </label>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#5F6368]">Workspace role</span>
              <div className="w-full rounded-xl border border-[#D9D8D2] bg-[#F3F2EE] px-3.5 py-2.5 text-sm text-[#252525]">Editor</div>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#5F6368]">Account</span>
              <div className="w-full rounded-xl border border-[#D9D8D2] bg-[#F3F2EE] px-3.5 py-2.5 text-sm text-[#252525]">
                {session ? 'Authenticated' : 'Signed out'}
              </div>
            </div>
          </div>
        </div>

        {(profileMessage || profileError) && (
          <div className={`text-xs font-medium ${profileError ? 'text-[#B84F3D]' : 'text-[#4F7F5B]'}`}>
            {profileError || profileMessage}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="button" data-ui-sound="success" onClick={handleSaveProfile} disabled={savingProfile} className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#252525] text-white text-xs font-semibold hover:bg-[#3A3A3A] disabled:opacity-60">
            <Save className="w-3.5 h-3.5" /> {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
          <span className="text-[11px] text-[#73757A]">Email changes may require confirmation from your new email address.</span>
        </div>
      </section>

      <section className="rolewise-card p-6 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Accessibility className="w-4 h-4 text-[#5F6368]" />
          <div>
            <h2 className="text-sm font-semibold text-[#252525]">Accessibility</h2>
            <p className="text-xs text-[#73757A]">Optional interface enhancements for clearer focus, contrast, and interaction.</p>
          </div>
        </div>

        <Toggle
          checked={accessibilityEnabled}
          onChange={setAccessibilityEnabled}
          label="Accessibility enhancements"
          description="Turn on stronger focus visibility, contrast, readable controls, and accessibility-friendly interaction defaults."
        />
        <Toggle
          checked={reducedMotion}
          onChange={setReducedMotion}
          label="Reduce motion"
          description="Minimize interface animation and transition effects."
        />

        <div className="pt-3 border-t border-[#D9D8D2] flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-[#4F7F5B] font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Keyboard focus visible
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-[#4F7F5B] font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Skip navigation enabled
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-[#4F7F5B] font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Reduced-motion preference supported
          </span>
        </div>

        <button type="button" onClick={handleResetAccessibility} className="touch-target inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#D9D8D2] bg-white text-[#252525] text-xs font-semibold hover:bg-[#F3F2EE]">
          <RotateCcw className="w-3.5 h-3.5" /> Reset accessibility preferences
        </button>
      </section>

      <section className="rolewise-card p-6 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-[#5F6368]" />
          <div>
            <h2 className="text-sm font-semibold text-[#252525]">Notifications</h2>
            <p className="text-xs text-[#73757A]">Control non-critical browser notifications from ROLEWISE.</p>
          </div>
        </div>
        <Toggle
          checked={notificationsEnabled}
          onChange={setNotificationsEnabled}
          label="Workspace notifications"
          description="Allow ROLEWISE to show non-critical notification prompts and updates."
        />
      </section>

      <section className="rolewise-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#5F6368]" />
          <h2 className="text-sm font-semibold text-[#252525]">Audio & Video</h2>
        </div>
        <p className="text-xs text-[#73757A] leading-relaxed">
          Communication Practice uses your browser microphone and camera permissions.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleTestMic} className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#D9D8D2] hover:bg-[#F3F2EE] text-xs font-semibold text-[#252525]">
            <Mic className="w-3.5 h-3.5" /> Test microphone
          </button>
          {micTested !== null && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${micTested ? 'text-[#4F7F5B]' : 'text-[#B84F3D]'}`}>
              {micTested ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {micTested ? 'Microphone available' : 'Permission denied or unavailable'}
            </span>
          )}
          <button type="button" onClick={handleTestCamera} className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#D9D8D2] hover:bg-[#F3F2EE] text-xs font-semibold text-[#252525]">
            <Video className="w-3.5 h-3.5" /> Test camera
          </button>
          {cameraTested !== null && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${cameraTested ? 'text-[#4F7F5B]' : 'text-[#B84F3D]'}`}>
              {cameraTested ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {cameraTested ? 'Camera available' : 'Permission denied or unavailable'}
            </span>
          )}
        </div>
      </section>

      <section className="rolewise-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#5F6368]" />
          <h2 className="text-sm font-semibold text-[#252525]">Privacy & Security</h2>
        </div>
        <p className="text-xs text-[#73757A] leading-relaxed">
          Your job descriptions, resume details, and practice recordings are tied to your authenticated account. ROLEWISE does not expose workspace data to other users.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4F7F5B]">
            <CheckCircle2 className="w-4 h-4" /> Authenticated account
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4F7F5B]">
            <CheckCircle2 className="w-4 h-4" /> User-scoped workspace data
          </span>
        </div>
      </section>

      <section className="rolewise-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[#252525]">Account session</h2>
          <p className="text-xs text-[#73757A] mt-1">{session?.user?.email || 'No active account'}</p>
        </div>
        <button type="button" onClick={() => signOut()} className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#F6D8D1] text-[#B84F3D] hover:bg-[#FFF0ED] text-xs font-semibold">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </section>
    </div>
  );
}
