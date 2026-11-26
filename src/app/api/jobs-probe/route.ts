import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const maxDuration = 60;

const GH = 'phonepe postman browserstack rubrik databricks mongodb stripe airbnb cloudflare gitlab druva innovaccer groww cred razorpay meesho sharechat zomato swiggy freshworks chargebee hasura whatfix mindtickle darwinbox leadsquared zeta slice upstox uber twilio okta coinbase nutanix harness thoughtspot confluent elastic hubspot intercom zscaler grammarly canva dropbox pinterest reddit samsara toast duolingo atlassian nykaa urbancompany cars24 spinny moengage clevertap highlevel devrev atlan sprinto juspay setu plum gupshup yellowai haptik wingify vedantu physicswallah unacademy scaler practo pharmeasy licious rapido ola dream11 games24x7 mpl smallcase jar fi zepto khatabook cleartax inmobi paytm'.split(' ');
const ASHBY = 'zepto cred atlan devrev sarvam juspay setu plum ramp deel notion linear openai vercel supabase posthog rippling airtable replit perplexity multiplier sprinto smallcase jar fi groww razorpay meesho skuad remote zeta'.split(' ');
const SR = 'Freshworks Visa BoschGroup Ubisoft2 Swiggy Nielsen IKEA Sanofi Wipro Accenture Publicissapient Synechron'.split(' ');

const INDIA = /india|bengaluru|bangalore|mumbai|pune|hyderabad|chennai|gurugram|gurgaon|noida|delhi|kolkata|ahmedabad|coimbatore|kochi|jaipur|chandigarh|indore|thiruvananthapuram/i;

async function j(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(9000), cache: 'no-store' });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

export async function GET() {
  const tasks: Promise<{ src: string; total: number; india: number; sample?: string }>[] = [];
  for (const s of GH) tasks.push(j(`https://boards-api.greenhouse.io/v1/boards/${s}/jobs`).then((d) => { const jobs = d.jobs || []; const ind = jobs.filter((x: { location?: { name?: string } }) => INDIA.test(x.location?.name || '')); return { src: `gh:${s}`, total: jobs.length, india: ind.length, sample: ind[0]?.title }; }));
  for (const s of GH) tasks.push(j(`https://api.lever.co/v0/postings/${s}?mode=json&limit=500`).then((d) => { const jobs = Array.isArray(d) ? d : []; const ind = jobs.filter((x: { categories?: { location?: string; allLocations?: string[] } }) => INDIA.test([x.categories?.location, ...(x.categories?.allLocations || [])].join(' '))); return { src: `lever:${s}`, total: jobs.length, india: ind.length, sample: ind[0]?.text }; }));
  for (const s of ASHBY) tasks.push(j(`https://api.ashbyhq.com/posting-api/job-board/${s}`).then((d) => { const jobs = d.jobs || []; const ind = jobs.filter((x: { location?: string; secondaryLocations?: { location?: string }[] }) => INDIA.test([x.location, ...(x.secondaryLocations || []).map((l) => l.location)].join(' '))); return { src: `ashby:${s}`, total: jobs.length, india: ind.length, sample: ind[0]?.title }; }));
  for (const s of SR) tasks.push(j(`https://api.smartrecruiters.com/v1/companies/${s}/postings?country=in&limit=100`).then((d) => ({ src: `sr:${s}`, total: d.totalFound || 0, india: (d.content || []).length, sample: d.content?.[0]?.name })));
  const res = await Promise.allSettled(tasks);
  const ok = res.filter((r) => r.status === 'fulfilled').map((r) => (r as PromiseFulfilledResult<{ src: string; total: number; india: number; sample?: string }>).value).filter((x) => x.india > 0).sort((a, b) => b.india - a.india);
  return NextResponse.json({ count: ok.length, ok });
}
