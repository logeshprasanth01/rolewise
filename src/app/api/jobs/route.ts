import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Live remote openings for a role, from Jobicy's free public API.
 * Jobicy asks that listings credit them and that "Apply" links go to the original job page,
 * so `url` is passed through unchanged and the UI shows the source.
 * Responses are cached for an hour (their fair-use guidance: no more than hourly syncing).
 */

type JobicyJob = {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  jobType?: string[] | string;
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  pubDate?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
};

export interface OpenJob {
  id: string;
  title: string;
  company: string;
  logo: string | null;
  location: string;
  type: string;
  level: string;
  postedAt: string | null;
  url: string;
  salary: string | null;
  excerpt: string;
}

const STOP = new Set(['and', 'the', 'of', 'for', 'a', 'an', 'to', 'in', 'with', 'senior', 'junior', 'sr', 'jr', 'lead', 'ii', 'iii', 'intern']);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/\//g, ' ')
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/** Search tags to try, most specific first: "ui ux designer" → "ux designer" → "designer". */
function tagsFor(q: string): string[] {
  const t = tokens(q);
  const out = [t.join(' ')];
  if (t.length > 2) out.push(t.slice(-2).join(' '));
  if (t.length > 1) out.push(t[t.length - 1]);
  return [...new Set(out)].filter(Boolean).slice(0, 2);
}

function salaryText(j: JobicyJob): string | null {
  if (!j.salaryMin && !j.salaryMax) return null;
  const cur = j.salaryCurrency || '';
  const fmt = (n?: number) => (n ? (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)) : '');
  const range = j.salaryMin && j.salaryMax && j.salaryMin !== j.salaryMax ? `${fmt(j.salaryMin)}–${fmt(j.salaryMax)}` : fmt(j.salaryMin || j.salaryMax);
  const per = j.salaryPeriod ? ` / ${j.salaryPeriod.replace('ly', '').replace('annual', 'year')}` : '';
  return `${cur} ${range}${per}`.trim();
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&#8217;|&rsquo;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').slice(0, 80).trim();
  if (q.length < 2) return NextResponse.json({ jobs: [], source: null });

  const wanted = tokens(q);
  const seen = new Set<number>();
  const jobs: OpenJob[] = [];

  try {
    const tags = tagsFor(q);
    for (let i = 0; i < tags.length && jobs.length < 6; i++) {
      if (i > 0) await sleep(1100); // Jobicy: at least 1s between requests
      const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tags[i])}`, {
        next: { revalidate: 3600 },
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) break;
      const data = (await res.json()) as { jobs?: JobicyJob[] };
      for (const j of data.jobs || []) {
        if (seen.has(j.id) || !j.url || !j.jobTitle) continue;
        // Keep only titles that share a real word with the role (tag search also matches inside words).
        const titleTokens = new Set(tokens(j.jobTitle));
        const overlap = wanted.filter((w) => titleTokens.has(w)).length;
        if (overlap === 0) continue;
        seen.add(j.id);
        jobs.push({
          id: String(j.id),
          title: decode(j.jobTitle),
          company: decode(j.companyName || 'Company'),
          logo: j.companyLogo || null,
          location: j.jobGeo ? `Remote · ${decode(j.jobGeo)}` : 'Remote',
          type: Array.isArray(j.jobType) ? j.jobType.join(', ') : j.jobType || '',
          level: j.jobLevel && j.jobLevel !== 'Any' ? j.jobLevel : '',
          postedAt: j.pubDate || null,
          url: j.url,
          salary: salaryText(j),
          excerpt: decode(j.jobExcerpt || '').slice(0, 180),
        });
      }
    }
  } catch (err) {
    console.error('[Rolewise] jobs feed error', err);
    return NextResponse.json({ jobs: [], source: 'Jobicy', error: 'unavailable' }, { status: 200 });
  }

  // Closest title match first, then newest.
  jobs.sort((a, b) => {
    const score = (t: string) => wanted.filter((w) => tokens(t).includes(w)).length;
    return score(b.title) - score(a.title) || (Date.parse(b.postedAt || '') || 0) - (Date.parse(a.postedAt || '') || 0);
  });

  return NextResponse.json(
    { jobs: jobs.slice(0, 8), source: 'Jobicy', sourceUrl: 'https://jobicy.com' },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
  );
}
