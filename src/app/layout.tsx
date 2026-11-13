import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { MascotAssistant } from '@/components/assistant/MascotAssistant';
import { SITE_URL } from '@/lib/site';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'ROLEWISE — Prepare for the role. Not just the interview.',
  description:
    'Production-style AI interview preparation. Connect your real candidate experience with role requirements to build focused preparation plans.',
  openGraph: {
    type: 'website',
    siteName: 'Rolewise',
    url: '/welcome',
    title: 'Rolewise — Prepare for the role, not just the interview',
    description: 'See how well you fit each requirement, then prep and practise for that exact role. Free during early access.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rolewise — Prepare for the role, not just the interview',
    description: 'See how well you fit each requirement, then prep and practise for that exact role. Free during early access.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F7F7FB] text-[#1F2937]">
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <MascotAssistant />
        </AuthProvider>
      </body>
    </html>
  );
}
