import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Terms · Rolewise',
  description: 'The basic terms for using Rolewise during early access.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      intro="These are the basic terms for using Rolewise while it is in early access. By using Rolewise you agree to them."
    >
      <section>
        <h2>Early access</h2>
        <p>Rolewise is free while it is in early access. Features may change, and things may occasionally break while we improve them.</p>
      </section>
      <section>
        <h2>Your content</h2>
        <p>Your resume, job descriptions and answers stay yours. You let Rolewise use them only to provide the service to you. Please only upload content you have the right to use.</p>
      </section>
      <section>
        <h2>AI feedback is guidance</h2>
        <p>Fit scores, preparation plans and interview feedback are generated with AI. They are there to help you prepare, not to guarantee an outcome. Check anything important yourself.</p>
      </section>
      <section>
        <h2>Fair use</h2>
        <ul>
          <li>Do not try to break, overload or misuse the service.</li>
          <li>Do not use Rolewise to create content that is unlawful or harmful.</li>
        </ul>
      </section>
      <section>
        <h2>Changes</h2>
        <p>We may update these terms as Rolewise grows. The date at the top shows the latest version.</p>
      </section>
    </LegalPage>
  );
}
