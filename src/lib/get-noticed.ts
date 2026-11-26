/**
 * "Get noticed" helpers for the role fit page.
 * Everything here is deterministic: it reads the job description, the resume text and the
 * fit analysis that already exist. No new AI call, so the advice can't invent facts.
 */

/** Skill / tool terms recruiters and screening software search for. Each entry: label + match patterns. */
const LEXICON: { label: string; match: RegExp }[] = [
  // Design
  { label: 'Figma', match: /\bfigma\b/i },
  { label: 'Sketch', match: /\bsketch\b(?! ?book)/i },
  { label: 'Adobe XD', match: /\badobe xd\b|\bxd\b/i },
  { label: 'Adobe Creative Suite', match: /\badobe (creative (suite|cloud)|cc)\b/i },
  { label: 'Photoshop', match: /\bphotoshop\b/i },
  { label: 'Illustrator', match: /\billustrator\b/i },
  { label: 'After Effects', match: /\bafter effects\b/i },
  { label: 'Premiere Pro', match: /\bpremiere( pro)?\b/i },
  { label: 'Framer', match: /\bframer\b/i },
  { label: 'Webflow', match: /\bwebflow\b/i },
  { label: 'Prototyping', match: /\bprototyp(e|es|ing)\b/i },
  { label: 'Wireframes', match: /\bwire ?fram(e|es|ing)\b/i },
  { label: 'User flows', match: /\buser ?flows?\b/i },
  { label: 'User research', match: /\buser research\b|\bux research\b/i },
  { label: 'Usability testing', match: /\busability test(s|ing)?\b|\buser test(s|ing)\b/i },
  { label: 'Design system', match: /\bdesign systems?\b/i },
  { label: 'Interaction design', match: /\binteraction design\b/i },
  { label: 'Visual design', match: /\bvisual design\b/i },
  { label: 'Information architecture', match: /\binformation architecture\b/i },
  { label: 'Accessibility', match: /\baccessib(le|ility)\b|\bwcag\b|\ba11y\b/i },
  { label: 'Responsive design', match: /\bresponsive\b/i },
  { label: 'Mobile app design', match: /\bmobile (app|apps|application|design|ui)\b|\bios\b|\bandroid\b/i },
  { label: 'Design thinking', match: /\bdesign thinking\b/i },
  { label: 'Personas', match: /\bpersonas?\b/i },
  { label: 'Journey mapping', match: /\bjourney map(s|ping)?\b/i },
  { label: 'A/B testing', match: /\ba\/b test(s|ing)?\b|\bab test(s|ing)?\b|\bexperimentation\b/i },
  { label: 'Branding', match: /\bbrand(ing| identity)\b/i },
  { label: 'Motion design', match: /\bmotion (design|graphics)\b|\banimation\b/i },
  { label: 'Portfolio', match: /\bportfolio\b/i },
  { label: 'SaaS', match: /\bsaas\b/i },
  { label: 'Dashboards', match: /\bdashboards?\b/i },
  // Engineering
  { label: 'HTML/CSS', match: /\bhtml\b|\bcss\b/i },
  { label: 'JavaScript', match: /\bjavascript\b|\bjs\b/i },
  { label: 'TypeScript', match: /\btypescript\b/i },
  { label: 'React', match: /\breact(\.js|js)?\b(?! native)/i },
  { label: 'React Native', match: /\breact native\b/i },
  { label: 'Next.js', match: /\bnext\.?js\b/i },
  { label: 'Node.js', match: /\bnode(\.js|js)?\b/i },
  { label: 'Python', match: /\bpython\b/i },
  { label: 'Java', match: /\bjava\b(?!script)/i },
  { label: 'SQL', match: /\bsql\b|\bpostgres(ql)?\b|\bmysql\b/i },
  { label: 'REST APIs', match: /\brest(ful)? apis?\b|\bapis?\b/i },
  { label: 'AWS', match: /\baws\b|\bamazon web services\b/i },
  { label: 'Docker', match: /\bdocker\b|\bkubernetes\b/i },
  { label: 'Git', match: /\bgit(hub|lab)?\b/i },
  { label: 'Testing', match: /\bunit test(s|ing)?\b|\bjest\b|\bcypress\b|\bplaywright\b/i },
  { label: 'Tailwind CSS', match: /\btailwind\b/i },
  // Data / product / business
  { label: 'Excel', match: /\bexcel\b|\bspreadsheets?\b/i },
  { label: 'Power BI', match: /\bpower ?bi\b/i },
  { label: 'Tableau', match: /\btableau\b/i },
  { label: 'Analytics', match: /\banalytics\b|\bgoogle analytics\b|\bmixpanel\b|\bamplitude\b/i },
  { label: 'Machine learning', match: /\bmachine learning\b|\bml\b/i },
  { label: 'AI products', match: /\bai[- ]powered\b|\bgenerative ai\b|\bllms?\b|\bartificial intelligence\b/i },
  { label: 'Product roadmap', match: /\broadmaps?\b/i },
  { label: 'Agile / Scrum', match: /\bagile\b|\bscrum\b|\bsprints?\b/i },
  { label: 'Jira', match: /\bjira\b/i },
  { label: 'Stakeholder management', match: /\bstakeholders?\b/i },
  { label: 'Cross-functional teams', match: /\bcross[- ]functional\b/i },
  { label: 'SEO', match: /\bseo\b/i },
  { label: 'Social media', match: /\bsocial media\b|\binstagram\b/i },
  { label: 'Content strategy', match: /\bcontent strategy\b|\bcopywriting\b/i },
  { label: 'Influencer marketing', match: /\binfluencer\b/i },
  { label: 'CRM', match: /\bcrm\b|\bhubspot\b|\bsalesforce\b/i },
  { label: 'Communication', match: /\bcommunicat(e|ion|ing)\b|\bpresent(ing|ation)s?\b/i },
];

export interface KeywordReport {
  found: string[];
  missing: string[];
}

/** Which of the job's searchable terms already appear in the resume. Ordered as the job mentions them. */
export function keywordReport(jobDescription: string, resumeText: string): KeywordReport {
  const jd = jobDescription || '';
  const resume = resumeText || '';
  const inJob = LEXICON.map((k) => {
    const m = jd.match(k.match);
    return m ? { label: k.label, at: m.index ?? 0, re: k.match } : null;
  })
    .filter((x): x is { label: string; at: number; re: RegExp } => !!x)
    .sort((a, b) => a.at - b.at)
    .slice(0, 16);

  return {
    found: inJob.filter((k) => k.re.test(resume)).map((k) => k.label),
    missing: inJob.filter((k) => !k.re.test(resume)).map((k) => k.label),
  };
}

export interface ResumeCheck {
  id: string;
  ok: boolean;
  title: string;
  detail: string;
}

/** Quick checks a recruiter does in the first skim. Returns [] when there is no resume text. */
export function resumeChecks(resumeText: string, jobTitle: string): ResumeCheck[] {
  const text = resumeText || '';
  if (text.trim().length < 40) return [];

  // Measurable results: percentages, multipliers, currency, or "N+ users/clients/..."
  const metricMatches =
    text.match(/\b\d+(\.\d+)?\s?%|\b\d+(\.\d+)?x\b|[₹$€£]\s?\d|\b\d+\+?\s?(k|m|lakh|crore)?\s?(users|customers|clients|downloads|screens|components|projects|members|people|stores|brands|sales|leads)\b/gi) || [];
  const metrics = metricMatches.length;

  // Job title words (ignore filler) present in the resume
  const titleWords = (jobTitle || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 1 && !['and', 'the', 'of', 'senior', 'junior', 'lead', 'sr', 'jr', 'ii', 'iii'].includes(w));
  const lower = text.toLowerCase();
  const titleHits = titleWords.filter((w) => lower.includes(w)).length;
  const titleOk = titleWords.length === 0 || titleHits / titleWords.length >= 0.5;

  const hasLink = /(https?:\/\/|www\.|behance\.net|dribbble\.com|github\.com|linkedin\.com|\.(com|in|io|me|design|dev)\/)/i.test(text);
  const words = text.trim().split(/\s+/).length;

  return [
    {
      id: 'metrics',
      ok: metrics >= 3,
      title: metrics >= 3 ? `${metrics} measurable results` : metrics === 0 ? 'No measurable results yet' : `Only ${metrics} measurable result${metrics === 1 ? '' : 's'}`,
      detail:
        metrics >= 3
          ? 'Numbers make your impact easy to spot. Keep the strongest ones near the top.'
          : 'Add numbers to your best bullets: “cut drop-off by 18%”, “shipped 40 screens”, “used by 2k people”.',
    },
    {
      id: 'title',
      ok: titleOk,
      title: titleOk ? `Your resume speaks “${jobTitle}”` : `“${jobTitle}” is missing from your resume`,
      detail: titleOk
        ? 'The role name appears in your resume, so a recruiter searching for it can find you.'
        : `Use the role name in your headline or summary, e.g. “${jobTitle} with …”. Recruiters search by title first.`,
    },
    {
      id: 'link',
      ok: hasLink,
      title: hasLink ? 'Portfolio or profile link found' : 'No portfolio or profile link',
      detail: hasLink
        ? 'Make sure the link opens without a login and shows work related to this role.'
        : 'Add a portfolio, Behance, GitHub or LinkedIn link at the top. Recruiters check proof of work first.',
    },
    {
      id: 'length',
      ok: words >= 250 && words <= 900,
      title: words < 250 ? 'Resume looks thin' : words > 900 ? 'Resume is long' : 'Resume length is easy to skim',
      detail:
        words < 250
          ? `About ${words} words. Add 2–3 bullets per role showing what you did and the result.`
          : words > 900
          ? `About ${words} words. Trim older or unrelated work so this role’s strengths stand out.`
          : `About ${words} words, which is about one to two pages. Good for a quick skim.`,
    },
  ];
}

/** Trim a requirement sentence to a short, readable label. */
export function shortRequirement(text: string, max = 90): string {
  const t = (text || '').replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}
