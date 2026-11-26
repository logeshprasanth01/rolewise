import { NextRequest, NextResponse } from 'next/server';
import { DOMAINS, Domain, OpenJob, companyJobs, domainOf, levelOf, remoteJobs } from '@/lib/job-feed';

export const runtime = 'nodejs';
export const maxDuration = 30;

const STOP = new Set(['and', 'the', 'of', 'for', 'a', 'an', 'to', 'in', 'with', 'senior', 'junior', 'sr', 'jr', 'lead', 'ii', 'iii', 'i', 'jobs', 'job', 'role']);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/\//g, ' ')
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function score(job: OpenJob, words: string[]): number {
  if (!words.length) return 1;
  const title = new Set(tokens(job.title));
  const extra = `${job.company} ${job.department}`.toLowerCase();
  let s = 0;
  for (const w of words) {
    if (title.has(w)) s += 3;
    else if ([...title].some((t) => t.startsWith(w) || w.startsWith(t))) s += 2;
    else if (extra.includes(w)) s += 1;
  }
  return s;
}

/**
 * GET /api/jobs?q=&domain=&city=&work=remote|onsite&level=intern|entry|mid|senior|lead&posted=1|7|30&sort=relevant|recent&page=1
 * Real openings: India roles from company career boards + India-friendly remote roles.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get('q') || '').slice(0, 80).trim();
  const domainParam = sp.get('domain') as Domain | null;
  const domain = domainParam && DOMAINS.includes(domainParam) ? domainParam : null;
  const city = (sp.get('city') || '').trim();
  const work = sp.get('work');
  const level = sp.get('level');
  const postedDays = Number(sp.get('posted')) || 0;
  const sort = sp.get('sort') === 'recent' ? 'recent' : 'relevant';
  const page = Math.max(1, Math.min(50, Number(sp.get('page')) || 1));
  const pageSize = 20;

  const [company, remote] = await Promise.all([companyJobs().catch(() => ({ jobs: [] as OpenJob[], companies: 0 })), remoteJobs(q).catch(() => [] as OpenJob[])]);

  // De-duplicate across sources by company + title.
  const seen = new Set<string>();
  const all: OpenJob[] = [];
  for (const j of [...company.jobs, ...remote]) {
    const key = `${j.company.toLowerCase()}|${j.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    all.push(j);
  }

  // 1. Keyword match. If the exact role has no openings, fall back to the role's domain.
  const words = tokens(q);
  let relaxed = false;
  let matched = all.map((j) => ({ j, s: score(j, words) })).filter((x) => x.s >= Math.min(3, words.length * 2));
  if (words.length && matched.length === 0) {
    const guess = domainOf(q);
    if (guess !== 'Other') {
      relaxed = true;
      matched = all.filter((j) => j.domain === guess).map((j) => ({ j, s: 1 }));
    }
  }

  // 2. Location, work type, experience level, date posted
  const since = postedDays ? Date.now() - postedDays * 86_400_000 : 0;
  const byCity = matched.filter(({ j }) => {
    if (city && city !== 'All India') {
      if (city === 'Remote') {
        if (!j.remote) return false;
      } else if (!(j.city === city || j.location.includes(city))) return false;
    }
    if (work === 'remote' && !j.remote) return false;
    if (work === 'onsite' && j.remote) return false;
    if (level && levelOf(j.title) !== level) return false;
    if (since && !(Date.parse(j.postedAt || '') >= since)) return false;
    return true;
  });

  // Facet counts (before the domain filter, so the chips show what each domain would give)
  const domainCounts: Record<string, number> = {};
  for (const { j } of byCity) domainCounts[j.domain] = (domainCounts[j.domain] || 0) + 1;

  // 3. Domain
  const filtered = domain ? byCity.filter(({ j }) => j.domain === domain) : byCity;

  // Most relevant: best match first, then newest. Most recent: newest only.
  const time = (x: { j: OpenJob }) => Date.parse(x.j.postedAt || '') || 0;
  filtered.sort((a, b) => (sort === 'recent' ? time(b) - time(a) : b.s - a.s || time(b) - time(a)));

  // Keep variety: no company more than 4 times in any run of 20 (big employers otherwise fill page 1).
  const spread: typeof filtered = [];
  const deferred: typeof filtered = [];
  for (const item of filtered) {
    const window = spread.slice(-19);
    if (window.filter((x) => x.j.company === item.j.company).length >= 4) deferred.push(item);
    else spread.push(item);
  }
  const ordered = [...spread, ...deferred];

  const total = ordered.length;
  const jobs = ordered.slice((page - 1) * pageSize, page * pageSize).map(({ j }) => j);
  const companies = new Set(filtered.map(({ j }) => j.company)).size;

  return NextResponse.json(
    {
      jobs,
      total,
      page,
      hasMore: page * pageSize < total,
      companies,
      relaxed,
      relaxedDomain: relaxed ? domainOf(q) : null,
      domainCounts,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } }
  );
}
