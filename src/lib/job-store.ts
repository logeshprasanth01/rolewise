/**
 * Server-only store for job listings (Supabase tables job_listings + job_sync_runs).
 *
 * /api/jobs/sync runs every hour (Supabase pg_cron, with a daily Vercel cron as backup). It reads every
 * feed live, upserts what it finds, and closes listings a feed no longer returns. Each listing keeps
 * the time Rolewise first saw it, which drives the "New" badges and the new-job alerts.
 * /api/jobs reads from here; if the store is empty or unreachable it falls back to the live feeds.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenJob, aggregatorEnabled, aggregatorJobs, companyJobs, logoFor, remoteJobs, setFreshFetch } from '@/lib/job-feed';

const URL_ = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

let client: SupabaseClient | null = null;
function admin(): SupabaseClient | null {
  if (!URL_ || !KEY) return null;
  if (!client) client = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export function storeEnabled(): boolean {
  return !!admin();
}

/** Role searches run on JSearch (LinkedIn, Indeed, Naukri…) every 6 hours when a key is set. */
const JSEARCH_QUERIES = (process.env.JSEARCH_QUERIES ||
  'UI UX designer,product designer,graphic designer,product manager,software engineer,data analyst,business analyst,digital marketing,sales executive,HR recruiter,customer success,finance analyst')
  .split(',')
  .map((q) => q.trim())
  .filter(Boolean);

type Row = { id: string; feed: string; source: string; company: string; title: string; domain: string; job: OpenJob; description_html: string | null };

function toRow(j: OpenJob): Row {
  const job = { ...j };
  delete job.descriptionHtml;
  delete job.firstSeenAt;
  delete job.isNew;
  return {
    id: j.id,
    feed: j.feed || 'unknown',
    source: j.source,
    company: j.company,
    title: j.title,
    domain: j.domain,
    job,
    description_html: j.descriptionHtml || null,
  };
}

export interface SyncResult {
  ok: boolean;
  total: number;
  added: number;
  closed: number;
  feeds: number;
  failedFeeds: string[];
  jsearch: boolean;
  ms: number;
  error?: string;
}

export async function syncJobs(opts: { withJSearch?: boolean } = {}): Promise<SyncResult> {
  const t0 = Date.now();
  const db = admin();
  if (!db) return { ok: false, total: 0, added: 0, closed: 0, feeds: 0, failedFeeds: [], jsearch: false, ms: 0, error: 'store not configured' };

  setFreshFetch(true);
  let company: Awaited<ReturnType<typeof companyJobs>>;
  let remote: OpenJob[];
  let agg: OpenJob[] = [];
  const useJSearch = !!opts.withJSearch && aggregatorEnabled();
  try {
    [company, remote] = await Promise.all([companyJobs({ force: true }), remoteJobs('')]);
    if (useJSearch) {
      const res = await Promise.allSettled(JSEARCH_QUERIES.map((q) => aggregatorJobs(q, { pages: 2, force: true })));
      agg = res.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    }
  } finally {
    setFreshFetch(false);
  }

  const okFeeds = [...company.okFeeds];
  if (remote.some((j) => j.feed === 'himalayas')) okFeeds.push('himalayas');
  if (remote.some((j) => j.feed === 'jobicy')) okFeeds.push('jobicy');
  if (agg.length) okFeeds.push('jsearch');

  // One row per id (a listing can appear in several JSearch searches).
  const rows = new Map<string, Row>();
  for (const j of [...company.jobs, ...agg, ...remote]) if (!rows.has(j.id)) rows.set(j.id, toRow(j));
  const all = [...rows.values()];

  const runAt = new Date().toISOString();
  let added = 0;
  try {
    for (let i = 0; i < all.length; i += 300) {
      const { data, error } = await db.rpc('upsert_job_listings', { rows: all.slice(i, i + 300), run_at: runAt });
      if (error) throw error;
      added += Number(data) || 0;
    }
    const { data: closedData, error: closeErr } = await db.rpc('close_stale_job_listings', { run_at: runAt, ok_feeds: okFeeds });
    if (closeErr) throw closeErr;
    const closed = Number(closedData) || 0;
    // Feeds that errored this run keep their listings open until a later run succeeds.
    const failedFeeds = company.failedFeeds;
    await db.from('job_sync_runs').insert({
      ran_at: runAt,
      total: all.length,
      added,
      closed,
      feeds: okFeeds.length,
      details: { jsearch: useJSearch, ms: Date.now() - t0, failedFeeds },
    });
    storeCache = null;
    return { ok: true, total: all.length, added, closed, feeds: okFeeds.length, failedFeeds, jsearch: useJSearch, ms: Date.now() - t0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('[Rolewise] job sync failed', message);
    return { ok: false, total: all.length, added, closed: 0, feeds: okFeeds.length, failedFeeds: company.failedFeeds, jsearch: useJSearch, ms: Date.now() - t0, error: message };
  }
}

/* ---------- reading the store ---------- */

export interface StoredFeed {
  jobs: OpenJob[];
  updatedAt: string | null;
  /** Time of the first sync: listings seen in it existed before Rolewise did, so they aren't "new". */
  baseline: string | null;
}

const NEW_WINDOW = 24 * 60 * 60 * 1000;
const READ_TTL = 5 * 60 * 1000;
let storeCache: { at: number; value: StoredFeed } | null = null;
let storeInflight: Promise<StoredFeed | null> | null = null;

export async function storedJobs(): Promise<StoredFeed | null> {
  const db = admin();
  if (!db) return null;
  if (storeCache && Date.now() - storeCache.at < READ_TTL) return storeCache.value;
  if (storeInflight) return storeInflight;
  storeInflight = (async () => {
    const [last, first] = await Promise.all([
      db.from('job_sync_runs').select('ran_at').order('ran_at', { ascending: false }).limit(1),
      db.from('job_sync_runs').select('ran_at').order('ran_at', { ascending: true }).limit(1),
    ]);
    if (last.error) throw last.error;
    const updatedAt = (last.data?.[0]?.ran_at as string | undefined) || null;
    const baseline = (first.data?.[0]?.ran_at as string | undefined) || null;
    if (!updatedAt) return null;

    const rows: { job: OpenJob; first_seen_at: string }[] = [];
    for (let from = 0; from < 20000; from += 1000) {
      const { data, error } = await db
        .from('job_listings')
        .select('job, first_seen_at')
        .eq('active', true)
        .order('first_seen_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, from + 999);
      if (error) throw error;
      rows.push(...((data || []) as typeof rows));
      if (!data || data.length < 1000) break;
    }

    const now = Date.now();
    const base = baseline ? Date.parse(baseline) + 30 * 60 * 1000 : Infinity;
    const jobs = rows.map(({ job, first_seen_at }) => {
      const seen = Date.parse(first_seen_at);
      const isNew = seen > base && now - seen < NEW_WINDOW;
      return {
        ...job,
        logo: job.logo || logoFor(job.company),
        firstSeenAt: first_seen_at,
        isNew,
        // A listing with no posted date was posted around when we first saw it (after the first sync).
        postedAt: job.postedAt || (seen > base ? first_seen_at : null),
      };
    });
    const value = { jobs, updatedAt, baseline };
    storeCache = { at: Date.now(), value };
    return value;
  })()
    .catch((err) => {
      console.error('[Rolewise] job store read failed', err?.message || err);
      return null;
    })
    .finally(() => {
      storeInflight = null;
    });
  return storeInflight;
}

/** One stored listing with its description, or null when it isn't in the store. */
export async function storedDetail(id: string): Promise<OpenJob | null> {
  const db = admin();
  if (!db) return null;
  const { data, error } = await db.from('job_listings').select('job, description_html, first_seen_at').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const job = data.job as OpenJob;
  return { ...job, logo: job.logo || logoFor(job.company), descriptionHtml: (data.description_html as string | null) || undefined, firstSeenAt: data.first_seen_at as string };
}
