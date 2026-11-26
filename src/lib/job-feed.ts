/**
 * Server-only job feed. Pulls real openings from official public job-board APIs:
 *  - Company career boards (Greenhouse, Lever, Ashby, SmartRecruiters) for companies hiring in India
 *  - Himalayas (remote, India-friendly) — terms: keep applicationLink unchanged, credit Himalayas
 *  - Jobicy (remote) — terms: credit Jobicy, Apply goes to the original posting
 *  - Amazon's public job search (India)
 * Everything is normalised into OpenJob. /api/jobs/sync stores it in Supabase every hour (see job-store.ts);
 * the in-memory caches here are the fallback when the store is empty or unreachable.
 */

export type Domain =
  | 'Engineering'
  | 'Design'
  | 'Product'
  | 'Data & AI'
  | 'Marketing'
  | 'Sales'
  | 'Customer Success'
  | 'Operations'
  | 'Finance & Legal'
  | 'People & HR'
  | 'Other';

export const DOMAINS: Domain[] = [
  'Engineering',
  'Design',
  'Product',
  'Data & AI',
  'Marketing',
  'Sales',
  'Customer Success',
  'Operations',
  'Finance & Legal',
  'People & HR',
  'Other',
];

export interface OpenJob {
  id: string;
  title: string;
  company: string;
  logo: string | null;
  location: string;
  city: string | null;
  remote: boolean;
  type: string;
  department: string;
  domain: Domain;
  postedAt: string | null;
  url: string;
  /** 'Company careers', 'Himalayas', 'Jobicy', or the job site JSearch found it on (LinkedIn, Indeed, Naukri…). */
  source: string;
  sourceUrl: string | null;
  salary: string | null;
  /** Raw HTML from the source when the list API includes it. Never sent in list responses. */
  descriptionHtml?: string;
  /** Which feed produced it (e.g. "gh:stripe", "amazon", "jsearch"); used by the hourly sync. */
  feed?: string;
  /** When Rolewise first saw this listing (from the stored feed). */
  firstSeenAt?: string | null;
  /** First seen in the last 24 hours. */
  isNew?: boolean;
}

/** Boards verified to return India openings (Nov 2026). [ats, slug, display name] */
const BOARDS: ['gh' | 'lever' | 'ashby' | 'sr' | 'workable', string, string][] = [
  ['lever', 'paytm', 'Paytm'],
  ['workable', 'apna', 'Apna'],
  ['sr', 'Swiggy', 'Swiggy'],
  ['sr', 'BoschGroup', 'Bosch'],
  ['gh', 'okta', 'Okta'],
  ['gh', 'zscaler', 'Zscaler'],
  ['sr', 'ServiceNow', 'ServiceNow'],
  ['gh', 'mongodb', 'MongoDB'],
  ['gh', 'databricks', 'Databricks'],
  ['lever', 'meesho', 'Meesho'],
  ['gh', 'rubrik', 'Rubrik'],
  ['gh', 'stripe', 'Stripe'],
  ['lever', 'hevodata', 'Hevo Data'],
  ['ashby', 'sarvam', 'Sarvam AI'],
  ['gh', 'sigmoid', 'Sigmoid'],
  ['lever', 'zeta', 'Zeta'],
  ['gh', 'inmobi', 'InMobi'],
  ['sr', 'Freshworks', 'Freshworks'],
  ['gh', 'gitlab', 'GitLab'],
  ['gh', 'zenoti', 'Zenoti'],
  ['gh', 'toast', 'Toast'],
  ['gh', 'hackerrank', 'HackerRank'],
  ['lever', 'mindtickle', 'Mindtickle'],
  ['sr', 'Grab', 'Grab'],
  ['gh', 'elastic', 'Elastic'],
  ['lever', 'linkedin', 'LinkedIn'],
  ['gh', 'twilio', 'Twilio'],
  ['gh', 'agoda', 'Agoda'],
  ['ashby', 'openai', 'OpenAI'],
  ['lever', 'fampay', 'FamPay'],
  ['gh', 'glance', 'Glance'],
  ['ashby', 'snowflake', 'Snowflake'],
  ['gh', 'airbnb', 'Airbnb'],
  ['lever', 'cred', 'CRED'],
  ['gh', 'druva', 'Druva'],
  ['gh', 'coinbase', 'Coinbase'],
  ['gh', 'sumologic', 'Sumo Logic'],
  ['gh', 'commvault', 'Commvault'],
  ['gh', 'groww', 'Groww'],
  ['sr', 'ixigo', 'ixigo'],
  ['gh', 'datadog', 'Datadog'],
  ['ashby', 'spotdraft', 'SpotDraft'],
  ['sr', 'Ubisoft2', 'Ubisoft'],
  ['gh', 'samsara', 'Samsara'],
  ['gh', 'devrev', 'DevRev'],
  ['gh', 'observeai', 'Observe.AI'],
  ['gh', 'newrelic', 'New Relic'],
  ['ashby', 'atlan', 'Atlan'],
  ['sr', 'unacademy', 'Unacademy'],
  ['sr', 'instahyre', 'Instahyre'],
  ['lever', 'pocketfm', 'Pocket FM'],
  ['gh', 'figma', 'Figma'],
  ['ashby', 'notion', 'Notion'],
  ['sr', 'wise', 'Wise'],
  ['lever', 'nium', 'Nium'],
  ['ashby', 'airwallex', 'Airwallex'],
];

/** Company websites, for logos on boards that don't send one. */
const COMPANY_DOMAINS: Record<string, string> = {
  Paytm: 'paytm.com', Apna: 'apna.co', Swiggy: 'swiggy.com', Bosch: 'bosch.com', Okta: 'okta.com',
  Zscaler: 'zscaler.com', ServiceNow: 'servicenow.com', MongoDB: 'mongodb.com', Databricks: 'databricks.com',
  Meesho: 'meesho.com', Rubrik: 'rubrik.com', Stripe: 'stripe.com', 'Hevo Data': 'hevodata.com',
  'Sarvam AI': 'sarvam.ai', Sigmoid: 'sigmoid.com', Zeta: 'zeta.tech', InMobi: 'inmobi.com',
  Freshworks: 'freshworks.com', GitLab: 'gitlab.com', Zenoti: 'zenoti.com', Toast: 'toasttab.com',
  HackerRank: 'hackerrank.com', Mindtickle: 'mindtickle.com', Grab: 'grab.com', Elastic: 'elastic.co',
  LinkedIn: 'linkedin.com', Twilio: 'twilio.com', Agoda: 'agoda.com', OpenAI: 'openai.com',
  FamPay: 'famapp.in', Glance: 'glance.com', Snowflake: 'snowflake.com', Airbnb: 'airbnb.com',
  CRED: 'cred.club', Druva: 'druva.com', Coinbase: 'coinbase.com', 'Sumo Logic': 'sumologic.com',
  Commvault: 'commvault.com', Groww: 'groww.in', ixigo: 'ixigo.com', Datadog: 'datadoghq.com',
  SpotDraft: 'spotdraft.com', Ubisoft: 'ubisoft.com', Samsara: 'samsara.com', DevRev: 'devrev.ai',
  'Observe.AI': 'observe.ai', 'New Relic': 'newrelic.com', Atlan: 'atlan.com', Unacademy: 'unacademy.com',
  Instahyre: 'instahyre.com', 'Pocket FM': 'pocketfm.com', Figma: 'figma.com', Notion: 'notion.so',
  Wise: 'wise.com', Nium: 'nium.com', Airwallex: 'airwallex.com', Amazon: 'amazon.com',
};

/** A logo for a known company (its site icon, 128px; 404 when the site has none, so the UI falls back). */
export function logoFor(company: string): string | null {
  const domain = COMPANY_DOMAINS[company];
  if (!domain) return null;
  return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;
}

const CITIES: [string, RegExp][] = [
  ['Bengaluru', /bengaluru|bangalore/i],
  ['Chennai', /chennai/i],
  ['Hyderabad', /hyderabad/i],
  ['Pune', /\bpune\b/i],
  ['Mumbai', /mumbai|navi mumbai|thane/i],
  ['Delhi NCR', /delhi|gurugram|gurgaon|noida|ncr|faridabad/i],
  ['Kolkata', /kolkata/i],
  ['Ahmedabad', /ahmedabad/i],
  ['Coimbatore', /coimbatore/i],
  ['Kochi', /kochi|cochin|thiruvananthapuram|trivandrum/i],
  ['Jaipur', /jaipur/i],
];

const INDIA = /india|bengaluru|bangalore|mumbai|pune|hyderabad|chennai|gurugram|gurgaon|noida|delhi|kolkata|ahmedabad|coimbatore|kochi|jaipur|chandigarh|indore|thiruvananthapuram|trivandrum/i;

export function cityOf(location: string): string | null {
  for (const [name, re] of CITIES) if (re.test(location)) return name;
  return null;
}

/** Classify by title first (most reliable), then department. */
export type Level = 'intern' | 'entry' | 'mid' | 'senior' | 'lead';

/** Experience level from the title, the way LinkedIn groups it. */
export function levelOf(title: string): Level {
  const t = title.toLowerCase();
  if (/\b(intern|internship|trainee|apprentice)\b/.test(t)) return 'intern';
  if (/\b(director|head|vp|vice president|chief|cxo|manager|lead)\b/.test(t) && !/\b(account|key account|area|territory|relationship) manager\b/.test(t)) return 'lead';
  if (/\b(senior|sr\.?|staff|principal)\b/.test(t)) return 'senior';
  if (/\b(junior|jr\.?|entry|fresher|graduate|associate|i)\b/.test(t) && !/\baccount executive\b/.test(t)) return 'entry';
  return 'mid';
}

export function domainOf(title: string, department = ''): Domain {
  const t = `${title}`.toLowerCase();
  const d = `${department}`.toLowerCase();
  const test = (re: RegExp) => re.test(t) || (!!d && re.test(d));
  if (/\b(sales engineer|solutions? engineer|solutions? consultant|pre-?sales|account executive|account manager|business development)/i.test(t)) return 'Sales';
  const isEngineerTitle = /\b(engineer|developer|sde)\b/i.test(t) && !/\bdesign(er)?\b/i.test(t);
  if (!isEngineerTitle && /\b(designer|design lead|ux|ui\b|ui\/|user research|visual|graphic|illustrat|motion|creative director)/i.test(t)) return 'Design';
  if (/\b(product manager|product owner|product lead|head of product|program manager|technical program|tpm\b|product ops)/i.test(t)) return 'Product';
  if (/\b(data scien|data analy|analytics|machine learning|\bml\b|\bai\b|research scientist|applied scientist|data engineer|business intelligence|\bbi\b|statistic|decision science|llm)/i.test(t)) return 'Data & AI';
  if (/\b(sap|abap|salesforce developer|servicenow|oracle|erp)\b/i.test(t)) return 'Engineering';
  if (/\b(engineer|developer|sde|architect|devops|sre\b|site reliability|qa\b|quality assurance|test|security|infrastructure|platform|firmware|embedded|mobile|android|ios|frontend|backend|full ?stack|software|technical lead|tech lead|programmer|it support|it admin|network|cloud)/i.test(t)) return 'Engineering';
  if (/\b(market|brand|content|seo|growth|social media|communications|pr\b|public relations|copywrit|community|campaign|demand gen|events?)\b/i.test(t)) return 'Marketing';
  if (/\b(sales|account executive|account manager|business development|bdr|sdr|partnerships?|alliances|channel|key account|pre-?sales|solutions consultant|revenue|ad sales)\b/i.test(t)) return 'Sales';
  if (/\b(customer|support|success|service|onboarding|implementation|client|helpdesk|technical account)\b/i.test(t)) return 'Customer Success';
  if (/\b(finance|account(ant|ing)|audit|tax|treasury|payroll|legal|counsel|compliance|risk|controller|fp&a|collections|credit)\b/i.test(t)) return 'Finance & Legal';
  if (/\b(recruit|talent|hr\b|human resources|people|hrbp|learning|l&d|workplace|culture)\b/i.test(t)) return 'People & HR';
  if (/\b(operations|ops\b|supply|logistics|procurement|purchas|buyer|sourcing|quality|manufactur|plant|production|strategy|analyst|business|category|program|project|admin|executive assistant|office|facilities|fleet|warehouse)\b/i.test(t)) return 'Operations';
  // Fall back to the department name
  if (test(/engineer|technology|r&d|it\b|developer|software|information technology/)) return 'Engineering';
  if (test(/design/)) return 'Design';
  if (test(/product/)) return 'Product';
  if (test(/data|ai\b/)) return 'Data & AI';
  if (test(/marketing/)) return 'Marketing';
  if (test(/sales|revenue|go to market|gtm/)) return 'Sales';
  if (test(/support|success|customer/)) return 'Customer Success';
  if (test(/finance|legal/)) return 'Finance & Legal';
  if (test(/people|hr|talent/)) return 'People & HR';
  if (test(/operation|business|purchas|procure|supply|manufactur|quality/)) return 'Operations';
  if (/\b(consultant|specialist|associate|manager|coordinator)\b/i.test(t)) return 'Operations';
  return 'Other';
}

const clean = (s: string) =>
  (s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&#8217;|&rsquo;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();

const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** "bangalore, , India" → "Bengaluru, India"; unknown places keep their own name. */
function tidyPlace(city?: string, region?: string): string {
  const raw = [city, region].filter((x) => x && x.trim()).join(' ');
  const known = cityOf(raw);
  if (known) return `${known}, India`;
  const first = (city || region || '').trim();
  return first ? `${titleCase(first)}, India` : 'India';
}

/** The hourly sync sets this so it always reads the boards live, not from Next's fetch cache. */
let FRESH = false;
export function setFreshFetch(on: boolean) {
  FRESH = on;
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(9000),
    ...(FRESH ? { cache: 'no-store' as const } : { next: { revalidate: 3600 } }),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function make(partial: Omit<OpenJob, 'city' | 'domain' | 'remote'> & { remote?: boolean }): OpenJob {
  const remote = partial.remote ?? /remote|anywhere|work from home|wfh/i.test(partial.location);
  const city = cityOf(partial.location);
  // Company boards write places many ways ("Bangalore - DD", "bengaluru, , India"); show one clean name.
  const location =
    partial.source === 'Company careers'
      ? city
        ? remote ? `Remote · ${city}` : city
        : clean(partial.location).replace(/\s*,\s*,/g, ',') || 'India'
      : clean(partial.location) || (remote ? 'Remote' : 'India');
  return {
    ...partial,
    logo: partial.logo || logoFor(partial.company),
    title: clean(partial.title),
    location,
    city,
    remote,
    domain: domainOf(partial.title, partial.department),
  };
}

type GHJob = { id: number; title: string; absolute_url: string; updated_at?: string; first_published?: string; location?: { name?: string }; departments?: { name: string }[] };
type LeverJob = { id: string; text: string; hostedUrl: string; createdAt?: number; workplaceType?: string; description?: string; lists?: { text: string; content: string }[]; additional?: string; categories?: { location?: string; allLocations?: string[]; team?: string; department?: string; commitment?: string } };
type AshbyJob = { id: string; title: string; jobUrl: string; descriptionHtml?: string; publishedAt?: string; location?: string; secondaryLocations?: { location?: string }[]; department?: string; team?: string; employmentType?: string; isRemote?: boolean; workplaceType?: string };
type WorkableJob = { title: string; shortcode: string; employment_type?: string; telecommuting?: boolean; department?: string; function?: string; url?: string; application_url?: string; published_on?: string; created_at?: string; country?: string; city?: string; state?: string; description?: string };
type SRJob = { id: string; name: string; releasedDate?: string; location?: { city?: string; region?: string; country?: string; remote?: boolean; fullLocation?: string }; department?: { label?: string }; function?: { label?: string }; typeOfEmployment?: { label?: string } };

async function board(ats: string, slug: string, company: string): Promise<OpenJob[]> {
  if (ats === 'gh') {
    const d = (await getJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`)) as { jobs?: GHJob[] };
    return (d.jobs || [])
      .filter((j) => INDIA.test(j.location?.name || ''))
      .map((j) =>
        make({
          id: `gh-${slug}-${j.id}`,
          title: j.title,
          company,
          logo: null,
          location: j.location?.name || 'India',
          type: '',
          department: j.departments?.[0]?.name || '',
          postedAt: j.first_published || j.updated_at || null,
          url: j.absolute_url,
          source: 'Company careers',
          sourceUrl: null,
          salary: null,
        })
      );
  }
  if (ats === 'lever') {
    const d = (await getJson(`https://api.lever.co/v0/postings/${slug}?mode=json&limit=500`)) as LeverJob[];
    return (Array.isArray(d) ? d : [])
      .filter((j) => INDIA.test([j.categories?.location, ...(j.categories?.allLocations || [])].join(' ')))
      .map((j) =>
        make({
          id: `lever-${slug}-${j.id}`,
          title: j.text,
          company,
          logo: null,
          location: j.categories?.location || (j.categories?.allLocations || []).join(', ') || 'India',
          remote: j.workplaceType === 'remote',
          type: j.categories?.commitment || '',
          department: j.categories?.department || j.categories?.team || '',
          postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
          url: j.hostedUrl,
          source: 'Company careers',
          sourceUrl: null,
          salary: null,
          descriptionHtml: [j.description || '', ...(j.lists || []).map((l) => `<h3>${l.text}</h3><ul>${l.content}</ul>`), j.additional || ''].join(''),
        })
      );
  }
  if (ats === 'ashby') {
    const d = (await getJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}`)) as { jobs?: AshbyJob[] };
    return (d.jobs || [])
      .filter((j) => INDIA.test([j.location, ...(j.secondaryLocations || []).map((l) => l.location)].join(' ')))
      .map((j) => {
        const indiaLoc = [j.location, ...(j.secondaryLocations || []).map((l) => l.location)].find((l) => INDIA.test(l || '')) || 'India';
        return make({
          id: `ashby-${slug}-${j.id}`,
          title: j.title,
          company,
          logo: null,
          location: indiaLoc,
          remote: j.isRemote || j.workplaceType === 'Remote',
          type: (j.employmentType || '').replace(/([a-z])([A-Z])/g, '$1-$2'),
          department: j.department || j.team || '',
          postedAt: j.publishedAt || null,
          url: j.jobUrl,
          source: 'Company careers',
          sourceUrl: null,
          salary: null,
          descriptionHtml: j.descriptionHtml || '',
        });
      });
  }
  if (ats === 'workable') {
    const d = (await getJson(`https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`)) as { jobs?: WorkableJob[] };
    return (d.jobs || [])
      .filter((j) => INDIA.test(`${j.country || ''} ${j.city || ''} ${j.state || ''}`))
      .map((j) =>
        make({
          id: `workable-${slug}-${j.shortcode}`,
          title: j.title,
          company,
          logo: null,
          location: tidyPlace(j.city, j.state),
          remote: !!j.telecommuting,
          type: j.employment_type || '',
          department: j.department || j.function || '',
          postedAt: j.published_on || j.created_at || null,
          url: j.url || j.application_url || `https://apply.workable.com/${slug}/j/${j.shortcode}/`,
          source: 'Company careers',
          sourceUrl: null,
          salary: null,
          descriptionHtml: j.description || '',
        })
      );
  }
  // SmartRecruiters
  const d = (await getJson(`https://api.smartrecruiters.com/v1/companies/${slug}/postings?country=in&limit=100`)) as { content?: SRJob[] };
  return (d.content || []).map((j) =>
    make({
      id: `sr-${slug}-${j.id}`,
      title: j.name,
      company,
      logo: null,
      location: tidyPlace(j.location?.city, j.location?.region),
      remote: !!j.location?.remote,
      type: j.typeOfEmployment?.label || '',
      department: j.function?.label || j.department?.label || '',
      postedAt: j.releasedDate || null,
      url: `https://jobs.smartrecruiters.com/${slug}/${j.id}`,
      source: 'Company careers',
      sourceUrl: null,
      salary: null,
    })
  );
}

type HimalayasJob = { description?: string; title: string; companyName: string; companyLogo?: string; employmentType?: string; locationRestrictions?: string[]; categories?: string[]; parentCategories?: string[]; minSalary?: number; maxSalary?: number; currency?: string; salaryPeriod?: string; pubDate?: number | string; applicationLink: string; guid: string };

function money(min?: number, max?: number, cur?: string, period?: string): string | null {
  if (!min && !max) return null;
  const f = (n?: number) => (n ? (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)) : '');
  const range = min && max && min !== max ? `${f(min)}–${f(max)}` : f(min || max);
  return `${cur || ''} ${range}${period ? ` / ${period.replace(/ly$/, '').replace('annual', 'year')}` : ''}`.trim();
}

async function himalayas(q: string): Promise<OpenJob[]> {
  const url = `https://himalayas.app/jobs/api/search?country=India${q ? `&q=${encodeURIComponent(q)}` : ''}&sort=recent`;
  const d = (await getJson(url, { headers: { Accept: 'application/json' } })) as { jobs?: HimalayasJob[] };
  return (d.jobs || [])
    .filter((j) => !(j.locationRestrictions || []).length || (j.locationRestrictions || []).some((c) => /india/i.test(c)))
    .map((j) => {
    const where = (j.locationRestrictions || []).length ? 'Remote · India' : 'Remote · Worldwide';
    const pub = typeof j.pubDate === 'number' ? new Date(j.pubDate * 1000).toISOString() : j.pubDate || null;
    return make({
      id: `him-${j.guid}`,
      title: j.title,
      company: clean(j.companyName),
      logo: j.companyLogo || null,
      location: where,
      remote: true,
      type: (j.employmentType || '').replace(/_/g, ' '),
      department: (j.parentCategories || j.categories || [])[0] || '',
      postedAt: pub,
      url: j.applicationLink,
      source: 'Himalayas',
      sourceUrl: j.guid?.startsWith('http') ? j.guid : 'https://himalayas.app/jobs',
      salary: money(j.minSalary, j.maxSalary, j.currency, j.salaryPeriod),
      descriptionHtml: j.description || '',
    });
  });
}

type JobicyJob = { jobDescription?: string; id: number; url: string; jobTitle: string; companyName: string; companyLogo?: string; jobType?: string[] | string; jobGeo?: string; jobIndustry?: string[]; pubDate?: string; salaryMin?: number; salaryMax?: number; salaryCurrency?: string; salaryPeriod?: string };

async function jobicy(q: string): Promise<OpenJob[]> {
  const url = `https://jobicy.com/api/v2/remote-jobs?count=50${q ? `&tag=${encodeURIComponent(q)}` : ''}`;
  const d = (await getJson(url, { headers: { Accept: 'application/json' } })) as { jobs?: JobicyJob[] };
  return (d.jobs || [])
    .filter((j) => /anywhere|worldwide|india|apac|asia/i.test(j.jobGeo || 'anywhere'))
    .map((j) =>
      make({
        id: `jobicy-${j.id}`,
        title: j.jobTitle,
        company: clean(j.companyName),
        logo: j.companyLogo || null,
        location: `Remote · ${clean(j.jobGeo || 'Anywhere')}`,
        remote: true,
        type: Array.isArray(j.jobType) ? j.jobType.join(', ') : j.jobType || '',
        department: (j.jobIndustry || [])[0] || '',
        postedAt: j.pubDate || null,
        url: j.url,
        source: 'Jobicy',
        sourceUrl: j.url,
        salary: money(j.salaryMin, j.salaryMax, j.salaryCurrency, j.salaryPeriod),
        descriptionHtml: j.jobDescription || '',
      })
    );
}

/* ---------- Amazon (public job search, India) ----------
 * Amazon hires in India at a scale no other board matches, so we read its public search:
 * the most recent openings plus a few role searches so every field is covered. ~10 requests an hour.
 */
type AmazonJob = {
  id_icims?: string;
  id?: string;
  title: string;
  company_name?: string;
  normalized_location?: string;
  location?: string;
  city?: string;
  posted_date?: string;
  job_path?: string;
  url_next_step?: string;
  description?: string;
  basic_qualifications?: string;
  preferred_qualifications?: string;
  job_category?: string;
  job_schedule_type?: string;
};
const AMAZON_QUERIES = ['', 'designer', 'product manager', 'data', 'marketing', 'finance', 'human resources', 'operations'];

async function amazonJobs(): Promise<OpenJob[]> {
  const pages: Promise<{ jobs?: AmazonJob[] }>[] = [];
  for (const q of AMAZON_QUERIES) {
    const offsets = q ? [0] : [0, 100, 200];
    for (const offset of offsets) {
      const qs = new URLSearchParams({ result_limit: '100', offset: String(offset), sort: 'recent', country: 'IND' });
      if (q) qs.set('base_query', q);
      pages.push(getJson(`https://www.amazon.jobs/en/search.json?${qs}`, { headers: { Accept: 'application/json' } }) as Promise<{ jobs?: AmazonJob[] }>);
    }
  }
  const results = await Promise.allSettled(pages);
  const seen = new Set<string>();
  const out: OpenJob[] = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const j of r.value.jobs || []) {
      const id = j.id_icims || j.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const posted = j.posted_date ? Date.parse(j.posted_date) : NaN;
      const section = (title: string, body?: string) => (body ? `<h3>${title}</h3><p>${body}</p>` : '');
      out.push(
        make({
          id: `amazon-${id}`,
          title: j.title,
          company: 'Amazon',
          logo: null,
          location: j.normalized_location || j.city || j.location || 'India',
          type: (j.job_schedule_type || '').replace(/^\w/, (c) => c.toUpperCase()),
          department: j.job_category || '',
          postedAt: Number.isFinite(posted) ? new Date(posted).toISOString() : null,
          url: j.job_path ? `https://www.amazon.jobs${j.job_path}` : j.url_next_step || 'https://www.amazon.jobs',
          source: 'Company careers',
          sourceUrl: null,
          salary: null,
          descriptionHtml:
            section('About the role', j.description) +
            section('Basic qualifications', j.basic_qualifications) +
            section('Preferred qualifications', j.preferred_qualifications),
          feed: 'amazon',
        })
      );
    }
  }
  if (!out.length) throw new Error('amazon: no jobs');
  return out;
}

/* ---------- in-memory cache (per server instance) ---------- */
const TTL = 30 * 60 * 1000;
type CompanyFeed = { jobs: OpenJob[]; companies: number; okFeeds: string[]; failedFeeds: string[] };
let companyCache: ({ at: number } & CompanyFeed) | null = null;
let companyInflight: Promise<CompanyFeed> | null = null;
const remoteCache = new Map<string, { at: number; jobs: OpenJob[] }>();

/** Every company board plus Amazon. `force` skips the cache (used by the hourly sync). */
export async function companyJobs(opts: { force?: boolean } = {}): Promise<CompanyFeed> {
  if (!opts.force && companyCache && Date.now() - companyCache.at < TTL) return companyCache;
  if (companyInflight) return companyInflight;
  companyInflight = (async () => {
    const feeds: { feed: string; run: () => Promise<OpenJob[]> }[] = [
      ...BOARDS.map(([ats, slug, name]) => ({ feed: `${ats}:${slug.toLowerCase()}`, run: () => board(ats, slug, name) })),
      { feed: 'amazon', run: amazonJobs },
    ];
    const results = await Promise.allSettled(feeds.map((f) => f.run()));
    const jobs: OpenJob[] = [];
    const okFeeds: string[] = [];
    const failedFeeds: string[] = [];
    let companies = 0;
    results.forEach((r, i) => {
      if (r.status !== 'fulfilled') {
        failedFeeds.push(feeds[i].feed);
        return;
      }
      okFeeds.push(feeds[i].feed);
      if (r.value.length) companies++;
      for (const j of r.value) jobs.push({ ...j, feed: feeds[i].feed });
    });
    // Same title at the same company in several cities → keep one, list cities together.
    const merged = new Map<string, OpenJob>();
    for (const j of jobs) {
      const key = `${j.company}|${j.title.toLowerCase()}`;
      const prev = merged.get(key);
      if (!prev) merged.set(key, j);
      else if (j.city && prev.city && !prev.location.includes(j.city)) prev.location = `${prev.location}, ${j.city}`;
    }
    const value = { jobs: [...merged.values()], companies, okFeeds, failedFeeds };
    if (value.jobs.length) companyCache = { at: Date.now(), ...value };
    return value;
  })().finally(() => {
    companyInflight = null;
  });
  return companyInflight;
}

export async function remoteJobs(q: string): Promise<OpenJob[]> {
  const key = q.toLowerCase().trim();
  const hit = remoteCache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.jobs;
  const [h, j] = await Promise.allSettled([himalayas(q), jobicy(q)]);
  const jobs = [
    ...(h.status === 'fulfilled' ? h.value.map((x) => ({ ...x, feed: 'himalayas' })) : []),
    ...(j.status === 'fulfilled' ? j.value.map((x) => ({ ...x, feed: 'jobicy' })) : []),
  ];
  if (remoteCache.size > 200) remoteCache.clear();
  remoteCache.set(key, { at: Date.now(), jobs });
  return jobs;
}


/* ---------- one job, with its full description ---------- */

const decodeEntities = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

/** Find a job by id in the cached feeds and return it with its description HTML (unsanitised). */
export async function jobDetail(id: string, q = ''): Promise<OpenJob | null> {
  const [company, remote] = await Promise.all([companyJobs().catch(() => ({ jobs: [] as OpenJob[] })), remoteJobs(q).catch(() => [] as OpenJob[])]);
  const agg = id.startsWith('js-') ? await aggregatorJobs(q).catch(() => [] as OpenJob[]) : [];
  let job = [...company.jobs, ...remote, ...agg].find((j) => j.id === id) || null;
  if (!job && q) job = (await remoteJobs('').catch(() => [] as OpenJob[])).find((j) => j.id === id) || null;
  if (!job) return null;
  return withDescription(job);
}

/** Fill in the description for boards whose list API leaves it out (Greenhouse, SmartRecruiters). */
export async function withDescription(job: OpenJob): Promise<OpenJob> {
  if (job.descriptionHtml) return job;
  const id = job.id;
  try {
    if (id.startsWith('gh-')) {
      const [, slug, jobId] = id.match(/^gh-(.+)-(\d+)$/) || [];
      const d = (await getJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs/${jobId}`)) as { content?: string };
      return { ...job, descriptionHtml: decodeEntities(d.content || '') };
    }
    if (id.startsWith('sr-')) {
      const [, slug, jobId] = id.match(/^sr-(.+)-(\d+)$/) || [];
      const d = (await getJson(`https://api.smartrecruiters.com/v1/companies/${slug}/postings/${jobId}`)) as {
        jobAd?: { sections?: Record<string, { title?: string; text?: string }> };
        applyUrl?: string;
      };
      const sections = d.jobAd?.sections || {};
      const html = ['jobDescription', 'qualifications', 'additionalInformation', 'companyDescription']
        .map((k) => sections[k])
        .filter((x) => x?.text)
        .map((x) => `<h3>${x!.title || ''}</h3>${x!.text}`)
        .join('');
      return { ...job, descriptionHtml: html, url: d.applyUrl || job.url };
    }
  } catch (err) {
    console.error('[Rolewise] job detail fetch failed', id, err);
  }
  return job;
}


/* ---------- LinkedIn / Indeed / Naukri / Glassdoor listings via JSearch (optional) ----------
 * JSearch (RapidAPI) licenses Google for Jobs data, which covers LinkedIn, Indeed, Naukri, Glassdoor
 * and company sites. It switches on only when JSEARCH_API_KEY is set in Vercel. We prefer the
 * direct company apply link when JSearch has one, so Apply goes to the employer, not a portal.
 */
type JSearchJob = {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo?: string | null;
  job_publisher?: string;
  job_employment_type?: string;
  job_apply_link: string;
  job_apply_is_direct?: boolean;
  apply_options?: { publisher: string; apply_link: string; is_direct?: boolean }[];
  job_description?: string;
  job_is_remote?: boolean;
  job_city?: string | null;
  job_state?: string | null;
  job_posted_at_datetime_utc?: string | null;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_currency?: string | null;
  job_salary_period?: string | null;
};

const aggCache = new Map<string, { at: number; jobs: OpenJob[] }>();
const AGG_TTL = 6 * 60 * 60 * 1000; // free plans have small monthly quotas, so cache longer

export function aggregatorEnabled(): boolean {
  return !!process.env.JSEARCH_API_KEY;
}

export async function aggregatorJobs(q: string, opts: { pages?: number; force?: boolean } = {}): Promise<OpenJob[]> {
  const key = process.env.JSEARCH_API_KEY;
  if (!key) return [];
  const pages = opts.pages ?? 3;
  const cacheKey = `${q.toLowerCase().trim() || '__all__'}|${pages}`;
  const hit = aggCache.get(cacheKey);
  if (!opts.force && hit && Date.now() - hit.at < AGG_TTL) return hit.jobs;

  const query = `${q.trim() || 'jobs'} in India`;
  const res = await fetch(
    `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=${pages}&country=in&date_posted=month`,
    {
      headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 21600 },
    }
  );
  if (!res.ok) throw new Error(`jsearch ${res.status}`);
  const d = (await res.json()) as { data?: JSearchJob[] };
  const escape = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const jobs = (d.data || []).map((j) => {
    const direct = j.apply_options?.find((o) => o.is_direct) || (j.job_apply_is_direct ? { publisher: j.employer_name, apply_link: j.job_apply_link } : null);
    const loc = [j.job_city, j.job_state].filter(Boolean).join(', ');
    return make({
      id: `js-${j.job_id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
      title: j.job_title,
      company: clean(j.employer_name),
      logo: j.employer_logo || null,
      location: j.job_is_remote ? 'Remote · India' : loc || 'India',
      remote: !!j.job_is_remote,
      type: (j.job_employment_type || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
      department: '',
      postedAt: j.job_posted_at_datetime_utc || null,
      url: direct?.apply_link || j.job_apply_link,
      source: direct ? 'Company careers' : j.job_publisher || 'Job site',
      sourceUrl: direct ? null : j.job_apply_link,
      salary: money(j.job_min_salary || undefined, j.job_max_salary || undefined, j.job_salary_currency || undefined, j.job_salary_period?.toLowerCase()),
      descriptionHtml: (j.job_description || '')
        .split(/\n{2,}/)
        .map((para) => `<p>${escape(para).replace(/\n/g, '<br/>')}</p>`)
        .join(''),
      feed: 'jsearch',
    });
  });
  if (aggCache.size > 100) aggCache.clear();
  aggCache.set(cacheKey, { at: Date.now(), jobs });
  return jobs;
}
