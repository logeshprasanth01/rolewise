import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy · Rolewise',
  description: 'What Rolewise collects, why, and who helps us run it.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="Rolewise is in early access. This page explains, in plain words, what we keep, why we keep it, and which services help us run Rolewise."
    >
      <section>
        <h2>What we keep</h2>
        <ul>
          <li>Your account details from sign-in: name and email (Google, LinkedIn or email sign-up).</li>
          <li>The jobs you add, including the job descriptions you paste.</li>
          <li>The text read from your resume, or the experience you type in yourself.</li>
          <li>Your fit analysis, preparation plan and progress.</li>
          <li>Your mock interview questions, answers and the feedback on them.</li>
        </ul>
      </section>
      <section>
        <h2>Why we keep it</h2>
        <p>Only to run Rolewise for you: matching your experience to the jobs you add, building your plan, and showing your practice history. We do not sell your data.</p>
      </section>
      <section>
        <h2>Who helps us run Rolewise</h2>
        <ul>
          <li>Supabase stores your account and data.</li>
          <li>Vercel hosts the website.</li>
          <li>AI providers (Google Gemini, and as backups OpenRouter or Groq) receive the job description, resume text or answer being analysed, to produce your fit analysis, questions and feedback.</li>
          <li>In Chrome and Edge, live transcription during voice practice uses the browser&apos;s built-in speech recognition, which is run by the browser maker.</li>
        </ul>
      </section>
      <section>
        <h2>Stored in your browser</h2>
        <p>Rolewise saves a few preferences on your device, such as sidebar layout, motion and sound settings, and short-lived copies of your analysis so pages load quickly.</p>
      </section>
      <section>
        <h2>Changes</h2>
        <p>While Rolewise is in early access this page may change. The date at the top shows the latest version.</p>
      </section>
    </LegalPage>
  );
}
