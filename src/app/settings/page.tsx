'use client';

import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Mic,
  Video,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { userName, session, signOut, anonKey, updateAnonKey, isConfigured } = useAuth();
  const [apiKeyInput, setApiKeyInput] = useState(anonKey || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [micTested, setMicTested] = useState<boolean | null>(null);

  const handleTestMic = async () => {
    try {
      if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setMicTested(true);
      } else {
        setMicTested(false);
      }
    } catch {
      setMicTested(false);
    }
  };

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    updateAnonKey(apiKeyInput.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <section className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-[#667085]">
          Manage your account, device permissions for voice/video practice, and workspace settings.
        </p>
      </section>

      {/* Account Profile Card */}
      <div className="rolewise-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-[#6D5DFB]" />
          <h2 className="text-sm font-semibold text-[#1F2937]">Account Information</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[#667085]">Full Name</span>
            <p className="font-semibold text-sm text-[#1F2937]">{userName || 'Logesh Prasanth'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[#667085]">Email Address</span>
            <p className="font-semibold text-sm text-[#1F2937]">{session?.user?.email || 'logesh@rolewise.io'}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-[#E7E8EF] flex items-center justify-between">
          <span className="text-xs text-[#667085]">Signed in as authenticated candidate</span>
          <button
            onClick={() => signOut()}
            className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FCDAD5] text-[#E87967] hover:bg-[#FFF0ED] text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* Device Permissions Check */}
      <div className="rolewise-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#6D5DFB]" />
          <h2 className="text-sm font-semibold text-[#1F2937]">Audio & Video Permissions</h2>
        </div>
        <p className="text-xs text-[#667085] leading-relaxed">
          Communication practice relies on standard browser media APIs. You can test your microphone connection below.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTestMic}
            className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E7E8EF] hover:bg-[#F9FAFB] text-xs font-semibold text-[#1F2937] transition-all shadow-xs"
          >
            <Mic className="w-3.5 h-3.5 text-[#6D5DFB]" />
            <span>Test Microphone Permission</span>
          </button>

          {micTested === true && (
            <span className="inline-flex items-center gap-1 text-xs text-[#4E9B76] font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Microphone available</span>
            </span>
          )}

          {micTested === false && (
            <span className="inline-flex items-center gap-1 text-xs text-[#E87967] font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>Permission denied or unavailable</span>
            </span>
          )}
        </div>
      </div>

      {/* Backend & AI Connection */}
      <div className="rolewise-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-[#6D5DFB]" />
          <h2 className="text-sm font-semibold text-[#1F2937]">Backend Configuration</h2>
        </div>

        <form onSubmit={handleSaveKey} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#1F2937]">Supabase Anon Key</label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E8EF] text-xs text-[#1F2937] focus:outline-none focus:border-[#6D5DFB]"
            />
            <p className="text-[11px] text-[#98A2B3]">
              Pre-configured. Leave as default or update to connect a custom Supabase instance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="touch-target px-4 py-2 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs font-semibold transition-all shadow-xs"
            >
              Save Configuration
            </button>

            {saveSuccess && (
              <span className="text-xs text-[#4E9B76] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Configuration saved</span>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
