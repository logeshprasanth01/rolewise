/**
 * Server-only job feed. Pulls real openings from official public job-board APIs:
 *  - Company career boards (Greenhouse, Lever, Ashby, SmartRecruiters) for companies hiring in India
 *  - Himalayas (remote, India-friendly) — terms: keep applicationLink unchanged, credit Himalayas
 *  - Jobicy (remote) — terms: credit Jobicy, Apply goes to the original posting
 * Everything is normalised into OpenJob and cached in memory for 30 minutes per server instance.
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
  source: 'Company careers' | 'Himalayas' | 'Jobicy';
  sourceUrl: string | null;
  salary: string | null;
}

/** Boards verified to return India openings (Nov 2026). [ats, slug, display name] */
const BOARDS: [ 'gh' | 'lever' | 'ashby' | 'sr', string, string][] = [
  ['lever', 'paytm', 'Paytm'],
  ['gh', 'okta', 'Okta'],
  ['sr', 'BoschGroup', 'Bosch'],
  ['sr', 'Swiggy', 'Swiggy'],
  ['gh', 'zscaler', 'Zscaler'],
  ['gh', 'mongodb', 'MongoDB'],
  ['gh', 'databricks', 'Databricks'],
  ['lever', 'meesho', 'Meesho'],
  ['gh', 'rubrik', 'Rubrik'],
  ['gh', 'stripe', 'Stripe'],
  ['ashby', 'sarvam', 'Sarvam AI'],
  ['gh', 'inmobi', 'InMobi'],
  ['lever', 'zeta', 'Zeta'],
  ['gh', 'gitlab', 'GitLab'],
  ['sr', 'Freshworks', 'Freshworks'],
  ['gh', 'toast', 'Toast'],
  ['lever', 'mindtickle', 'Mindtickle'],
  ['gh', 'elastic', 'Elastic'],
  ['gh', 'twilio', 'Twilio'],
  ['ashby', 'openai', 'OpenAI'],
  ['gh', 'airbnb', 'Airbnb'],
  ['gh', 'druva', 'Druva'],
  ['gh', 'coinbase', 'Coinbase'],
  ['lever', 'cred', 'CRED'],
  ['gh', 'groww', 'Groww'],
  ['sr', 'Ubisoft2', 'Ubisoft'],
  ['gh', 'samsara', 'Samsara'],
  ['gh', 'devrev', 'DevRev'],
  ['ashby', 'atlan', 'Atlan'],
  ['ashby', 'notion', 'Notion'],
];

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
export function domainOf(title: string, department = ''): Domain {
  const t = `${title}`.toLowerCase();
  const d = `${department}`.toLowerCase();
  const test = (re: RegExp) => re.test(t) || (!!d && re.test(d));
  if (/\b(sales engineer|solutions? engineer|solutions? consultant|pre-?sales)/i.test(t)) return 'Sales';
  if (/\b(designer|design lead|ux|ui\b|ui\/|user research|visual|graphic|illustrat|motion|creative director)/i.test(t)) return 'Design';
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

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(9000), next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function make(partial: Omit<OpenJob, 'city' | 'domain' | 'remote'> & { remote?: boolean }): OpenJob {
  const remote = partial.remote ?? /remote|anywhere|work from home|wfh/i.test(partial.location);
  return {
    ...partial,
    title: clean(partial.title),
    location: clean(partial.location) || (remote ? 'Remote' : 'India'),
    city: cityOf(partial.location),
    remote,
    domain: domainOf(partial.title, partial.department),
  };
}

type GHJob = { id: number; title: string; absolute_url: string; updated_at?: string; first_published?: string; location?: { name?: string }; departments?: { name: string }[] };
type LeverJob = { id: string; text: string; hostedUrl: string; createdAt?: number; workplaceType?: string; categories?: { location?: string; allLocations?: string[]; team?: string; department?: string; commitment?: string } };
type AshbyJob = { id: string; title: string; jobUrl: string; publishedAt?: string; location?: string; secondaryLocations?: { location?: string }[]; department?: string; team?: string; employmentType?: string; isRemote?: boolean; workplaceType?: string };
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
        });
      });
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

type HimalayasJob = { title: string; companyName: string; companyLogo?: string; employmentType?: string; locationRestrictions?: string[]; categories?: string[]; parentCategories?: string[]; minSalary?: number; maxSalary?: number; currency?: string; salaryPeriod?: string; pubDate?: number | string; applicationLink: string; guid: string };

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
    });
  });
}

type JobicyJob = { id: number; url: string; jobTitle: string; companyName: string; companyLogo?: string; jobType?: string[] | string; jobGeo?: string; jobIndustry?: string[]; pubDate?: string; salaryMin?: number; salaryMax?: number; salaryCurrency?: string; salaryPeriod?: string };

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
      })
    );
}

/* ---------- in-memory cache (per server instance) ---------- */
const TTL = 30 * 60 * 1000;
let companyCache: { at: number; jobs: OpenJob[]; companies: number } | null = null;
let companyInflight: Promise<{ jobs: OpenJob[]; companies: number }> | null = null;
const remoteCache = new Map<string, { at: number; jobs: OpenJob[] }>();

export async function companyJobs(): Promise<{ jobs: OpenJob[]; companies: number }> {
  if (companyCache && Date.now() - companyCache.at < TTL) return companyCache;
  if (companyInflight) return companyInflight;
  companyInflight = (async () => {
    const results = await Promise.allSettled(BOARDS.map(([ats, slug, name]) => board(ats, slug, name)));
    const jobs: OpenJob[] = [];
    let companies = 0;
    results.forEach((r) => {
      if (r.status === 'fulfilled' && r.value.length) {
        companies++;
        jobs.push(...r.value);
      }
    });
    // Same title at the same company in several cities → keep one, list cities together.
    const merged = new Map<string, OpenJob>();
    for (const j of jobs) {
      const key = `${j.company}|${j.title.toLowerCase()}`;
      const prev = merged.get(key);
      if (!prev) merged.set(key, j);
      else if (j.city && prev.city && !prev.location.includes(j.city)) prev.location = `${prev.location} · ${j.city}`;
    }
    const value = { jobs: [...merged.values()], companies };
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
  const jobs = [...(h.status === 'fulfilled' ? h.value : []), ...(j.status === 'fulfilled' ? j.value : [])];
  if (remoteCache.size > 200) remoteCache.clear();
  remoteCache.set(key, { at: Date.now(), jobs });
  return jobs;
}
