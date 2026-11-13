import type { Metadata } from 'next';
import { Landing } from '@/components/landing/Landing';

export const metadata: Metadata = {
  title: 'Rolewise — Prepare for the role, not just the interview',
  description:
    'Add a job, add your resume, and Rolewise shows how well you fit each requirement, builds a preparation plan for the gaps, and runs mock interviews by text, voice and video.',
};

export default function WelcomePage() {
  return <Landing />;
}
