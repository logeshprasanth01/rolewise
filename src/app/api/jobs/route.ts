import { NextRequest, NextResponse } from 'next/server';
import { DOMAINS, Domain, OpenJob, aggregatorJobs, companyJobs, domainOf, levelOf, remoteJobs } from '@/lib/job-feed';
import { storedJobs } from '@/lib/job-store';

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
    // Prefix matches (design → designer) only for real words, not 2–3 letter fragments.
    else if ([...title].some((t) => (w.length >= 4 && t.startsWith(w)) || (t.length >= 4 && w.startsWith(t)))) s += 2;
    else if (extra.includes(w)) s += 1;
  }
  return s;
}

/**
 * GET /api/jobs?q=&domain=&city=&work=remote|onsite&level=early|intern|entry|mid|senior|lead&posted=1|7|30&sort=relevant|recent&page=1
 *   &fresh=1        only listings first seen in the last 24 hours (or since `since`)
 *   &since=<ms>     the visitor's last visit: newSince counts listings first seen after it
 * Real openings: India roles from company career boards + India-friendly remote roles,
 * read from the hourly-synced store (job-store.ts) with the live feeds as fallback.
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
  const fresh = sp.get('fresh') === '1';
  const sinceParam = Number(sp.get('since')) || 0;

  // The stored feed (synced hourly) holds every board, Amazon and JSearch's role searches.
  // A search still asks the remote boards and JSearch live, since they search far wider than the store.
  const stored = await storedJobs().catch(() => null);
  const useStore = !!stored && stored.jobs.length > 200;
  const [company, remote, agg] = await Promise.all([
    useStore ? { jobs: stored!.jobs } : companyJobs().catch(() => ({ jobs: [] as OpenJob[] })),
    useStore && !q ? ([] as OpenJob[]) : remoteJobs(q).catch(() => [] as OpenJob[]),
    useStore && !q
      ? ([] as OpenJob[])
      : aggregatorJobs(q).catch((err) => {
          console.error('[Rolewise] JSearch failed', err);
          return [] as OpenJob[];
        }),
  ]);
  const storedIds = useStore ? new Map(stored!.jobs.map((j) => [j.id, j])) : null;

  // De-duplicate across sources by company + title.
  const seen = new Set<string>();
  const all: OpenJob[] = [];
  // Company career pages first, then LinkedIn/Indeed/Naukri listings, then remote boards.
  for (const raw of [...company.jobs, ...agg, ...remote]) {
    // Live results that are also stored keep their first-seen time.
    const j = storedIds?.get(raw.id) || raw;
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

  // 1b. New listings: first seen since the visitor's last visit, or in the last 24 hours.
  // Listings found by the very first sync were already open before Rolewise saw them, so never "new".
  const floor = useStore && stored!.baseline ? Date.parse(stored!.baseline) + 30 * 60 * 1000 : Infinity;
  const seenAfter = (j: OpenJob, t: number) => !!j.firstSeenAt && Date.parse(j.firstSeenAt) > Math.max(t, floor);
  const isFresh = (j: OpenJob) => (sinceParam ? seenAfter(j, sinceParam) : !!j.isNew);
  const newToday = matched.filter(({ j }) => j.isNew).length;
  const newSince = sinceParam ? matched.filter(({ j }) => seenAfter(j, sinceParam)).length : 0;
  if (fresh) matched = matched.filter(({ j }) => isFresh(j));

  // 2. Filters. Each facet's counts ignore that facet's own filter, so every option shows
  //    how many jobs you would get by picking it (UXHack / LinkedIn style).
  const since = postedDays ? Date.now() - postedDays * 86_400_000 : 0;
  type Facet = 'city' | 'domain' | 'work' | 'level' | 'posted';
  const lvl = (j: OpenJob) => levelOf(j.title);
  const passes = (j: OpenJob, except?: Facet) => {
    if (except !== 'city' && city && city !== 'All India') {
      if (city === 'Remote') {
        if (!j.remote) return false;
      } else if (!(j.city === city || j.location.includes(city))) return false;
    }
    if (except !== 'domain' && domain && j.domain !== domain) return false;
    if (except !== 'work' && work === 'remote' && !j.remote) return false;
    if (except !== 'work' && work === 'onsite' && j.remote) return false;
    if (except !== 'level' && level) {
      const l = lvl(j);
      if (level === 'early' ? !(l === 'intern' || l === 'entry') : l !== level) return false;
    }
    if (except !== 'posted' && since && !(Date.parse(j.postedAt || '') >= since)) return false;
    return true;
  };

  const count = (except: Facet, keyOf: (j: OpenJob) => string | string[] | null) => {
    const out: Record<string, number> = {};
    for (const { j } of matched) {
      if (!passes(j, except)) continue;
      const k = keyOf(j);
      for (const key of Array.isArray(k) ? k : k ? [k] : []) out[key] = (out[key] || 0) + 1;
    }
    return out;
  };
  const now = Date.now();
  const age = (j: OpenJob) => (now - (Date.parse(j.postedAt || '') || 0)) / 86_400_000;
  const domainCounts = count('domain', (j) => j.domain);
  const cityCounts = count('city', (j) => [...(j.city ? [j.city] : []), ...(j.remote ? ['Remote'] : [])]);
  const levelCounts = count('level', (j) => {
    const l = lvl(j);
    return l === 'intern' || l === 'entry' ? [l, 'early'] : [l];
  });
  const workCounts = count('work', (j) => (j.remote ? 'remote' : 'onsite'));
  const postedCounts = count('posted', (j) => {
    const a = age(j);
    return [...(a <= 1 ? ['1'] : []), ...(a <= 7 ? ['7'] : []), ...(a <= 30 ? ['30'] : [])];
  });

  const filtered = matched.filter(({ j }) => passes(j));

  // For the dashboard infographic: openings posted per day over the last 14 days (oldest first),
  // and the companies with the most openings.
  const DAY = 86_400_000;
  const startOfToday = new Date(new Date().toISOString().slice(0, 10)).getTime();
  const dailyCounts = Array.from({ length: 14 }, () => 0);
  const byCompany: Record<string, number> = {};
  for (const { j } of filtered) {
    byCompany[j.company] = (byCompany[j.company] || 0) + 1;
    const t = Date.parse(j.postedAt || '');
    if (!t) continue;
    const daysAgo = Math.floor((startOfToday + DAY - t) / DAY);
    if (daysAgo >= 0 && daysAgo < 14) dailyCounts[13 - daysAgo] += 1;
  }
  const topCompanies = Object.entries(byCompany)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Most relevant: best match first, then newest. Most recent: newest only.
  const time = (x: { j: OpenJob }) => Date.parse(x.j.postedAt || '') || 0;
  filtered.sort((a, b) => (sort === 'recent' ? time(b) - time(a) : b.s - a.s || time(b) - time(a)));

  // Keep variety: no company more than 4 times in any run of 20 (big employers otherwise fill page 1).
  const spread: typeof filtered = [];
  const deferred: typeof filtered = [];
  for (const item of filtered) {
    const window = spread.slice(-19);
    const sameCompany = window.filter((x) => x.j.company === item.j.company).length;
    // Remote-board jobs (Himalayas, Jobicy) take at most 1 in every 4 slots, so India company roles lead.
    const isBoard = item.j.source === 'Himalayas' || item.j.source === 'Jobicy';
    const boardNearby = spread.slice(-3).some((x) => x.j.source === 'Himalayas' || x.j.source === 'Jobicy');
    if (sameCompany >= 4 || (isBoard && boardNearby)) deferred.push(item);
    else spread.push(item);
  }
  const ordered = [...spread, ...deferred];

  const total = ordered.length;
  // Descriptions are only sent by /api/jobs/detail.
  const jobs = ordered.slice((page - 1) * pageSize, page * pageSize).map(({ j }) => {
    const rest = { ...j };
    delete rest.descriptionHtml;
    return rest;
  });
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
      cityCounts,
      levelCounts,
      workCounts,
      postedCounts,
      dailyCounts,
      topCompanies,
      newToday,
      newSince,
      updatedAt: useStore ? stored!.updatedAt : null,
    },
    // `since` makes URLs per-visitor, so those responses aren't shared from the CDN.
    { headers: { 'Cache-Control': sinceParam ? 'private, max-age=60' : 'public, s-maxage=300, stale-while-revalidate=1800' } }
  );
}
