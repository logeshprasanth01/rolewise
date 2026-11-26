/** Deep links into job portals, pre-filled with the role and location. */

export const JOB_LOCATIONS = ['India', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi NCR', 'Coimbatore', 'Remote'] as const;

export interface PortalLink {
  id: string;
  name: string;
  /** Short line under the name. */
  hint: string;
  href: string;
  /** Brand-neutral initials tile colour. */
  tint: string;
}

const enc = encodeURIComponent;
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Naukri city slugs differ from display names. */
function naukriCity(loc: string): string | null {
  const map: Record<string, string> = {
    bengaluru: 'bengaluru',
    chennai: 'chennai',
    hyderabad: 'hyderabad',
    pune: 'pune',
    mumbai: 'mumbai',
    'delhi ncr': 'delhi-ncr',
    coimbatore: 'coimbatore',
  };
  return map[loc.toLowerCase()] ?? null;
}

export function isDesignRole(title: string): boolean {
  return /\b(ux|ui|design|designer|product designer|visual|graphic|interaction|researcher)\b/i.test(title);
}

export function portalLinks(rawQuery: string, rawLocation: string): PortalLink[] {
  const q = rawQuery.trim() || 'jobs';
  const remote = rawLocation.trim().toLowerCase() === 'remote';
  const loc = remote ? 'India' : rawLocation.trim() || 'India';
  const city = naukriCity(loc);

  const links: PortalLink[] = [
    {
      id: 'linkedin',
      name: 'LinkedIn Jobs',
      hint: 'Posted in the last week',
      href: `https://www.linkedin.com/jobs/search/?keywords=${enc(q)}&location=${enc(loc)}&f_TPR=r604800${remote ? '&f_WT=2' : ''}`,
      tint: '#E3EEF9',
    },
    {
      id: 'naukri',
      name: 'Naukri',
      hint: city ? `Openings in ${loc}` : 'Openings across India',
      href: `https://www.naukri.com/${slug(q)}-jobs${city ? `-in-${city}` : ''}${remote ? '?wfhType=2' : ''}`,
      tint: '#E8F0FF',
    },
    {
      id: 'indeed',
      name: 'Indeed',
      hint: 'Company and agency listings',
      href: `https://in.indeed.com/jobs?q=${enc(q)}&l=${enc(remote ? 'Remote' : loc)}&fromage=14`,
      tint: '#EEF0FB',
    },
    {
      id: 'google',
      name: 'Google Jobs',
      hint: 'Collects listings from many sites',
      href: `https://www.google.com/search?q=${enc(`${q} jobs ${remote ? 'remote' : `in ${loc}`}`)}&ibp=htl;jobs`,
      tint: '#FFF4CC',
    },
    {
      id: 'glassdoor',
      name: 'Glassdoor',
      hint: 'With company reviews and salaries',
      href: `https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=${enc(q)}${remote ? '&remoteWorkType=1' : ''}`,
      tint: '#EEF7F0',
    },
  ];

  if (isDesignRole(q)) {
    links.push({
      id: 'uxhack',
      name: 'UXHack Jobs',
      hint: 'Design-only job board',
      href: 'https://uxhack.co/jobs',
      tint: '#F3EFE9',
    });
  }

  return links;
}

/** Where to apply for a job already in the tracker: its saved link, else a careers search. */
export function companyApplyLink(company: string, title: string, jobUrl?: string | null): { href: string; label: string; isDirect: boolean } {
  if (jobUrl && /^https?:\/\//i.test(jobUrl)) {
    let host = '';
    try {
      host = new URL(jobUrl).hostname.replace(/^www\./, '');
    } catch {
      host = '';
    }
    return { href: jobUrl, label: host ? `Apply on ${host}` : 'Open job posting', isDirect: true };
  }
  return {
    href: `https://www.google.com/search?q=${enc(`${company} careers ${title}`)}`,
    label: `Find it on ${company}'s careers page`,
    isDirect: false,
  };
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
