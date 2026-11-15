/**
 * Pulls a likely job title and company out of a pasted job description so
 * people don't have to pick them again from a list. It only suggests: the
 * Add a job form fills empty fields and tells the person to check them.
 */

const clean = (s: string) =>
  s
    .replace(/[*_#>|`]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[\s,.;:–-]+$/, '')
    .trim()
    .slice(0, 80);

const LABELLED_TITLE = /^\s*(?:job\s*title|position|role|designation|title)\s*[:\-–]\s*(.+)$/im;
const LABELLED_COMPANY = /^\s*(?:company(?:\s*name)?|organi[sz]ation|employer|hiring\s*company)\s*[:\-–]\s*(.+)$/im;
const ABOUT_COMPANY = /\babout\s+((?:[A-Z][\w&.'-]*)(?:\s+[A-Z][\w&.'-]*){0,3})\b/;
const AT_COMPANY = /\b(?:at|join)\s+((?:[A-Z][\w&.'-]*)(?:\s+[A-Z][\w&.'-]*){0,3})\b/;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

function findKnown(text: string, options: string[]): string | null {
  // Longest first, so "UI/UX Designer" wins over "UX Designer".
  const sorted = options.filter((o) => o !== 'Other').sort((a, b) => b.length - a.length);
  for (const opt of sorted) {
    if (new RegExp(`(^|[^\\w])${escape(opt)}([^\\w]|$)`, 'i').test(text)) return opt;
  }
  return null;
}

export function extractJobMeta(
  description: string,
  titleOptions: string[],
  companyOptions: string[],
): { title: string | null; company: string | null } {
  const text = description || '';
  const head = text.slice(0, 600);

  const labelledTitle = text.match(LABELLED_TITLE)?.[1];
  const title = labelledTitle ? clean(labelledTitle) : findKnown(head, titleOptions);

  const labelledCompany = text.match(LABELLED_COMPANY)?.[1];
  let company: string | null = labelledCompany ? clean(labelledCompany) : findKnown(text, companyOptions);
  if (!company) {
    const guess = head.match(ABOUT_COMPANY)?.[1] || head.match(AT_COMPANY)?.[1];
    // Skip generic words that often follow "about" or "at".
    if (guess && !/^(the|this|our|you|us|a|an|We|You|Our|The|This)$/i.test(guess.split(' ')[0])) company = clean(guess);
  }

  return { title: title || null, company: company || null };
}
