import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { RolewiseLogo } from '@/components/brand/RolewiseLogo';
import { CONTACT_EMAIL, LEGAL_UPDATED } from '@/lib/site';

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-[#F3F2EE] text-[#252525]">
      <header className="border-b border-[#E4E2DA] bg-white">
        <div className="mx-auto flex h-[72px] max-w-[880px] items-center justify-between px-5">
          <Link href="/welcome" aria-label="Rolewise home" className="block w-[140px]">
            <RolewiseLogo />
          </Link>
          <Link
            href="/welcome"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 text-[14px] font-medium text-[#3A3C40] hover:bg-black/5"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[720px] px-5 py-14 sm:py-20">
        <h1 className="text-[38px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[46px]">{title}</h1>
        <p className="mt-3 text-[14px] text-[#5E6065]">Last updated {LEGAL_UPDATED}</p>
        <p className="mt-6 text-[17px] leading-relaxed text-[#3A3C40]">{intro}</p>
        <div className="legal-body mt-10 space-y-8 text-[16px] leading-relaxed text-[#3A3C40] [&_h2]:text-[22px] [&_h2]:font-semibold [&_h2]:text-[#252525] [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:space-y-1.5">
          {children}
          {CONTACT_EMAIL && (
            <section>
              <h2>Contact</h2>
              <p>
                Questions about this page? Email{' '}
                <a className="font-medium underline underline-offset-2" href={`mailto:${CONTACT_EMAIL}`}>
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
