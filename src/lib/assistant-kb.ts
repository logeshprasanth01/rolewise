/**
 * Built-in help for the Rolewise assistant. Used to answer common questions
 * instantly (no AI call) and as the grounding text the AI is given.
 */

export interface HelpLink {
  label: string;
  href: string;
}

export interface HelpEntry {
  id: string;
  keywords: string[];
  answer: string;
  link?: HelpLink;
}

export const HELP: HelpEntry[] = [
  {
    id: 'start',
    keywords: ['start', 'begin', 'first', 'how does', 'how do i use', 'what is rolewise', 'get started', 'new here'],
    answer:
      'Rolewise helps you prepare for one specific role. Add the job description and your resume, then Rolewise maps each requirement to your experience, builds a prep plan for the gaps, and lets you practise with mock interviews written for that job.',
    link: { label: 'Add a job', href: '/jobs/new' },
  },
  {
    id: 'resume',
    keywords: ['resume', 'cv', 'upload', 'pdf', 'docx', 'scanned', 'could not be read', "can't read", 'word count', '40 words', 'extract'],
    answer:
      'Upload your resume as a PDF or DOCX exported from Word, Google Docs or Canva. When it works you will see "Resume read · N words". If fewer than 40 words can be read (common with scanned or photographed resumes), add your experience by hand instead.',
    link: { label: 'Open resume', href: '/resume' },
  },
  {
    id: 'fit',
    keywords: ['fit', 'score', 'percentage', 'percent', 'calculated', 'formula', 'strong', 'transferable', 'not shown', 'needs evidence', 'match'],
    answer:
      'Every requirement counts equally. Strong evidence counts 100%, transferable experience 60%, needs more evidence 30% and not shown 0%. "Not shown" means we could not find it in what you uploaded, not that you cannot do it. Labels: 80%+ Strong fit, 60%+ Good fit, 40%+ Partial fit, below that Stretch role.',
  },
  {
    id: 'prep',
    keywords: ['prep', 'preparation', 'plan', 'gap', 'gaps', 'mark as prepared', 'prepared', 'prepare first', 'what should i prepare'],
    answer:
      'Your preparation plan turns each weak requirement into a prep item, ordered with gaps first. Work through them in order, use "Mark as prepared" as you go, and your progress is saved.',
    link: { label: 'Open preparation', href: '/preparation' },
  },
  {
    id: 'interview',
    keywords: ['mock', 'interview', 'question', 'questions', 'answer', 'feedback', 'review'],
    answer:
      'Mock interviews use questions written from the job description. After each answer you get feedback on relevance and structure. If Rowi is busy, your answer is kept so you can ask again.',
    link: { label: 'See your feedback', href: '/feedback' },
  },
  {
    id: 'voice',
    keywords: ['voice', 'video', 'record', 'microphone', 'mic', 'camera', 'transcri', 'speech', 'browser', 'chrome', 'safari', 'firefox', 'edge'],
    answer:
      'Voice and video practice work in modern browsers. In Chrome and Edge your answer is written down live and free while you speak. In other browsers the recording is transcribed after you stop. Allow microphone (and camera for video) when your browser asks.',
    link: { label: 'Try voice practice', href: '/communication-practice/voice' },
  },
  {
    id: 'tracker',
    keywords: ['tracker', 'track', 'application', 'applications', 'status', 'follow up', 'follow-up', 'jobs'],
    answer:
      'The job tracker keeps every application, its status and follow-up reminders in one place. Open any job to jump to its fit analysis and prep plan.',
    link: { label: 'Open job tracker', href: '/jobs' },
  },
  {
    id: 'privacy',
    keywords: ['privacy', 'private', 'data', 'safe', 'secure', 'who can see', 'delete'],
    answer:
      'Your resume is saved to your account and shared with Rowi only to match it against the jobs you add.',
  },
  {
    id: 'account',
    keywords: ['sign in', 'sign up', 'login', 'log in', 'account', 'password', 'google', 'linkedin', 'register'],
    answer: 'You can sign up or sign in with Google, LinkedIn or email.',
    link: { label: 'Sign in or sign up', href: '/auth' },
  },
  {
    id: 'multiple',
    keywords: ['more than one', 'multiple', 'another job', 'several jobs', 'many jobs'],
    answer: 'Yes. Every job gets its own fit analysis, prep plan and mock interviews, and the job tracker keeps them together.',
    link: { label: 'Add another job', href: '/jobs/new' },
  },
];

export const SUGGESTIONS = [
  'Where do I start?',
  'How is the fit score calculated?',
  "My resume won't upload",
  'How does voice practice work?',
];

/** Returns the best built-in answer, or null when nothing matches well. */
export function matchHelp(text: string): HelpEntry | null {
  const q = text.toLowerCase();
  let best: { e: HelpEntry; score: number } | null = null;
  for (const e of HELP) {
    let score = 0;
    for (const k of e.keywords) if (q.includes(k)) score += k.length > 6 ? 2 : 1;
    if (score > 0 && (!best || score > best.score)) best = { e, score };
  }
  return best?.e ?? null;
}

export function helpAsText(): string {
  return HELP.map((h) => `- ${h.answer}${h.link ? ` (Page: ${h.link.href})` : ''}`).join('\n');
}
