import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const maxDuration = 60;

const INDIA = /india|bengaluru|bangalore|mumbai|pune|hyderabad|chennai|gurugram|gurgaon|noida|delhi|kolkata|ahmedabad|coimbatore|kochi|jaipur/i;
const T = (ms: number) => AbortSignal.timeout(ms);

// [host, tenant, site]
const WORKDAY: [string, string, string][] = [
  ['walmart.wd5.myworkdayjobs.com', 'walmart', 'WalmartExternal'],
  ['target.wd5.myworkdayjobs.com', 'target', 'targetcareers'],
  ['adobe.wd5.myworkdayjobs.com', 'adobe', 'external_experienced'],
  ['salesforce.wd12.myworkdayjobs.com', 'salesforce', 'External_Career_Site'],
  ['nvidia.wd5.myworkdayjobs.com', 'nvidia', 'NVIDIAExternalCareerSite'],
  ['intel.wd1.myworkdayjobs.com', 'intel', 'External'],
  ['mastercard.wd1.myworkdayjobs.com', 'mastercard', 'CorporateCareers'],
  ['paypal.wd1.myworkdayjobs.com', 'paypal', 'jobs'],
  ['dell.wd1.myworkdayjobs.com', 'dell', 'External'],
  ['hp.wd5.myworkdayjobs.com', 'hp', 'ExternalCareerSite'],
  ['ms.wd5.myworkdayjobs.com', 'ms', 'External'],
  ['autodesk.wd1.myworkdayjobs.com', 'autodesk', 'Ext'],
  ['workday.wd5.myworkdayjobs.com', 'workday', 'Workday'],
  ['philips.wd3.myworkdayjobs.com', 'philips', 'jobs-and-careers'],
  ['expedia.wd5.myworkdayjobs.com', 'expedia', 'search'],
  ['boeing.wd1.myworkdayjobs.com', 'boeing', 'EXTERNAL_CAREERS'],
  ['redhat.wd5.myworkdayjobs.com', 'redhat', 'jobs'],
  ['citi.wd5.myworkdayjobs.com', 'citi', '2'],
  ['wellsfargo.wd1.myworkdayjobs.com', 'wellsfargo', 'WellsFargoJobs'],
  ['visa.wd5.myworkdayjobs.com', 'visa', 'Visa'],
  ['kla.wd1.myworkdayjobs.com', 'kla', 'Search'],
  ['amat.wd1.myworkdayjobs.com', 'amat', 'External'],
  ['analogdevices.wd1.myworkdayjobs.com', 'analogdevices', 'External'],
  ['micron.wd1.myworkdayjobs.com', 'micron', 'External'],
  ['thomsonreuters.wd5.myworkdayjobs.com', 'thomsonreuters', 'External_Career_Site'],
  ['lseg.wd3.myworkdayjobs.com', 'lseg', 'Careers'],
  ['gartner.wd5.myworkdayjobs.com', 'gartner', 'EXT'],
  ['mckinsey.wd1.myworkdayjobs.com', 'mckinsey', 'External'],
  ['bcg.wd3.myworkdayjobs.com', 'bcg', 'BCG'],
  ['pwc.wd3.myworkdayjobs.com', 'pwc', 'Global_Experienced_Careers'],
  ['kpmg.wd3.myworkdayjobs.com', 'kpmg', 'KPMG'],
  ['ey.wd5.myworkdayjobs.com', 'ey', 'EY'],
  ['caterpillar.wd5.myworkdayjobs.com', 'caterpillar', 'CaterpillarCareers'],
  ['3m.wd1.myworkdayjobs.com', '3m', 'Search'],
  ['ge.wd5.myworkdayjobs.com', 'ge', 'GE_ExternalSite'],
  ['gevernova.wd5.myworkdayjobs.com', 'gevernova', 'GEVernova_ExternalSite'],
  ['comcast.wd5.myworkdayjobs.com', 'comcast', 'Comcast_Careers'],
  ['disney.wd5.myworkdayjobs.com', 'disney', 'disneycareer'],
  ['sonyglobal.wd1.myworkdayjobs.com', 'sonyglobal', 'SonyGlobalCareers'],
  ['nokia.wd3.myworkdayjobs.com', 'nokia', 'nokiacareers'],
  ['ericsson.wd3.myworkdayjobs.com', 'ericsson', 'External'],
  ['zf.wd3.myworkdayjobs.com', 'zf', 'ZF_Careers'],
  ['astrazeneca.wd3.myworkdayjobs.com', 'astrazeneca', 'Careers'],
  ['novartis.wd3.myworkdayjobs.com', 'novartis', 'Novartis_Careers'],
  ['pfizer.wd1.myworkdayjobs.com', 'pfizer', 'PfizerCareers'],
  ['abbott.wd5.myworkdayjobs.com', 'abbott', 'abbottcareers'],
  ['siemens-healthineers.wd3.myworkdayjobs.com', 'siemens-healthineers', 'SHS'],
  ['tesco.wd3.myworkdayjobs.com', 'tesco', 'External_Careers_Site'],
  ['hsbc.wd3.myworkdayjobs.com', 'hsbc', 'external'],
  ['standardchartered.wd3.myworkdayjobs.com', 'standardchartered', 'External'],
  ['barclays.wd3.myworkdayjobs.com', 'barclays', 'External_Career_Site_Barclays'],
  ['db.wd3.myworkdayjobs.com', 'db', 'DBWebsite'],
  ['ubs.wd3.myworkdayjobs.com', 'ubs', 'UBS_Experienced_Professionals'],
  ['blackrock.wd1.myworkdayjobs.com', 'blackrock', 'BlackRock_Professional'],
  ['statestreet.wd1.myworkdayjobs.com', 'statestreet', 'Global'],
  ['americanexpress.wd5.myworkdayjobs.com', 'americanexpress', 'AmericanExpress'],
  ['crowdstrike.wd5.myworkdayjobs.com', 'crowdstrike', 'crowdstrikecareers'],
  ['paloaltonetworks.wd5.myworkdayjobs.com', 'paloaltonetworks', 'paloaltonetworkscareers'],
  ['netapp.wd1.myworkdayjobs.com', 'netapp', 'NetAppCareers'],
  ['servicenow.wd1.myworkdayjobs.com', 'servicenow', 'Careers'],
  ['zoominfo.wd1.myworkdayjobs.com', 'zoominfo', 'ZoomInfo'],
  ['equifax.wd5.myworkdayjobs.com', 'equifax', 'External'],
  ['fis.wd5.myworkdayjobs.com', 'fis', 'SearchJobs'],
  ['broadridge.wd5.myworkdayjobs.com', 'broadridge', 'Careers'],
  ['optum.wd5.myworkdayjobs.com', 'optum', 'External'],
  ['lowes.wd5.myworkdayjobs.com', 'lowes', 'LWS_External_CS'],
  ['marriott.wd5.myworkdayjobs.com', 'marriott', 'marriottcareers'],
  ['hilton.wd1.myworkdayjobs.com', 'hilton', 'External'],
];

async function workday([host, tenant, site]: [string, string, string]) {
  const url = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;
  const body = (applied: Record<string, string[]>, limit: number) =>
    JSON.stringify({ appliedFacets: applied, limit, offset: 0, searchText: '' });
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: body({}, 1), signal: T(9000) });
  if (!r.ok) throw new Error(String(r.status));
  const d = await r.json();
  // find the India value in any location facet
  let applied: Record<string, string[]> | null = null;
  const scan = (facets: { facetParameter: string; values?: { descriptor?: string; id?: string; facetParameter?: string; values?: unknown[] }[] }[]) => {
    for (const f of facets || []) {
      for (const v of f.values || []) {
        if (v.facetParameter && Array.isArray(v.values)) scan([v as never]);
        if (/^india$/i.test(v.descriptor || '') && v.id) applied = { [f.facetParameter]: [v.id] };
      }
    }
  };
  scan(d.facets || []);
  if (!applied) return { src: `wd:${tenant}`, total: d.total || 0, india: 0, facet: null };
  const r2 = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: body(applied, 20), signal: T(9000) });
  const d2 = await r2.json();
  return { src: `wd:${tenant}`, total: d.total || 0, india: d2.total || 0, facet: Object.keys(applied)[0], sample: d2.jobPostings?.[0]?.title };
}

const NAMES = `swiggy zomato flipkart phonepe razorpay cred meesho groww zerodha upstox policybazaar makemytrip oyo olaelectric atherenergy rapido zepto blinkit bigbasket nykaa lenskart myntra urbancompany sharechat dailyhunt freshworks chargebee postman browserstack hasura icertis darwinbox leadsquared moengage clevertap webengage whatfix innovaccer practo pharmeasy curefit healthifyme unacademy vedantu physicswallah upgrad scaler khatabook okcredit jupiter slice smallcase indmoney coindcx coinswitch acko godigit turtlemint m2pfintech juspay cashfree pinelabs mobikwik bharatpe navi lendingkart ofbusiness udaan zetwerk moglix delhivery shadowfax porter blackbuck cars24 spinny cardekho dream11 games24x7 nazara winzo kukufm ixigo cleartrip redbus bookmyshow pepperfry livspace homelane nobroker classplus teachmint leapfinance stashfin kreditbee moneyview perfios signzy idfy hyperverge gupshup haptik yellowai verloop exotel plivo netcore capillary unbxd vymo zluri rocketlane sprinto scrut instamojo shiprocket cuemath embibe eruditus greatlearning masaischool newtonschool codingninjas geeksforgeeks unstop workindia thoughtworks sprinklr tigeranalytics fractal latentview quantiphi tredence uber atlassian intuit booking wayfair cisco dropbox asana vercel supabase rippling deel multiplier skuad jar ultrahuman boat mamaearth honasa wakefit licious freshtohome countrydelight bluestone caratlane krutrim observeai sarvam postman setu plum atlan devrev spotdraft hevodata glance agoda fampay pocketfm zenoti sigmoid hackerrank grab mindtickle commvault sumologic datadog newrelic figma notion snowflake openai airbnb coinbase toast samsara druva rubrik stripe gitlab elastic twilio okta zscaler mongodb databricks inmobi paytm zeta groww apna servicenow linkedin
canva miro airtable intercom zendesk hubspot shopify gojek bytedance tiktok spotify netflix pinterest reddit discord duolingo grammarly calendly loom zapier monday clickup freshdesk zoho vymo yubi credgenics jupiterapp fibe kissht paysense rupeek mintifi bizongo infra udaan dealshare citymall jumbotail ninjacart waycool licious zomato hyperface tartanhq cashify servify ekart vahan apnamart dunzo swiggy eightfold whatnot rapyd checkout adyen wise revolut monzo nium thunes airwallex payu razorpayx cashfree juspay khatabook mpl winzo nazara loco rooter stage chingari moj pratilipi kutumb koo leap yocket studyabroad sunstone simplilearn byjus toppr doubtnut vedantu extramarks testbook adda247 oliveboard gradeup careers360 shaadi jeevansathi bharatmatrimony naukri infoedge 99acres housing magicbricks squareyards nestaway stanza zolo colive oyorooms treebo fabhotels zostel hostelworld`.split(/\s+/).filter(Boolean);

async function j(url: string) {
  const r = await fetch(url, { signal: T(8000), cache: 'no-store' });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
type R = { src: string; total: number; india: number; facet?: string | null; sample?: string };
const boards: ((n: string) => Promise<R>)[] = [
  (n) => j(`https://boards-api.greenhouse.io/v1/boards/${n}/jobs`).then((d) => ({ src: `gh:${n}`, total: (d.jobs || []).length, india: (d.jobs || []).filter((x: { location?: { name?: string } }) => INDIA.test(x.location?.name || '')).length })),
  (n) => j(`https://api.lever.co/v0/postings/${n}?mode=json&limit=300`).then((d) => { const a = Array.isArray(d) ? d : []; return { src: `lever:${n}`, total: a.length, india: a.filter((x: { categories?: { location?: string; allLocations?: string[] } }) => INDIA.test([x.categories?.location, ...(x.categories?.allLocations || [])].join(' '))).length }; }),
  (n) => j(`https://api.ashbyhq.com/posting-api/job-board/${n}`).then((d) => ({ src: `ashby:${n}`, total: (d.jobs || []).length, india: (d.jobs || []).filter((x: { location?: string; secondaryLocations?: { location?: string }[] }) => INDIA.test([x.location, ...(x.secondaryLocations || []).map((l) => l.location)].join(' '))).length })),
  (n) => j(`https://api.smartrecruiters.com/v1/companies/${n}/postings?country=in&limit=1`).then((d) => ({ src: `sr:${n}`, total: d.totalFound || 0, india: d.totalFound || 0 })),
  (n) => j(`https://apply.workable.com/api/v1/widget/accounts/${n}`).then((d) => ({ src: `workable:${n}`, total: (d.jobs || []).length, india: (d.jobs || []).filter((x: { country?: string; city?: string }) => INDIA.test(`${x.country} ${x.city}`)).length })),
];

export async function GET(req: Request) {
  const part = new URL(req.url).searchParams.get('part') || 'workday';
  const out: R[] = [];
  const errors: string[] = [];
  if (part === 'workday') {
    const res = await Promise.allSettled(WORKDAY.map(workday));
    res.forEach((r, i) => (r.status === 'fulfilled' ? out.push(r.value) : errors.push(`${WORKDAY[i][1]}: ${String(r.reason).slice(0, 60)}`)));
    // Amazon + Microsoft public search
    try {
      const a = await j('https://www.amazon.jobs/en/search.json?result_limit=10&offset=0&country=IND&sort=recent');
      out.push({ src: 'amazon', total: a.hits || 0, india: a.hits || 0, sample: a.jobs?.[0]?.title });
    } catch (e) { errors.push(`amazon: ${String(e).slice(0, 60)}`); }
    try {
      const m = await j('https://gcsservices.careers.microsoft.com/search/api/v1/search?lc=India&l=en_us&pg=1&pgSz=20&o=Recent');
      out.push({ src: 'microsoft', total: m.operationResult?.result?.totalJobs || 0, india: m.operationResult?.result?.totalJobs || 0, sample: m.operationResult?.result?.jobs?.[0]?.title });
    } catch (e) { errors.push(`microsoft: ${String(e).slice(0, 60)}`); }
  } else {
    const names = [...new Set(NAMES)];
    const tasks = names.flatMap((n) => boards.map((b) => () => b(n)));
    for (let i = 0; i < tasks.length; i += 150) {
      const res = await Promise.allSettled(tasks.slice(i, i + 150).map((t) => t()));
      for (const r of res) if (r.status === 'fulfilled' && r.value.india > 2) out.push(r.value);
    }
  }
  out.sort((a, b) => b.india - a.india);
  return NextResponse.json({ part, count: out.length, india: out.reduce((a, b) => a + b.india, 0), out, errors: errors.slice(0, 80) });
}
