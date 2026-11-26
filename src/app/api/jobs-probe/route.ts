import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const maxDuration = 60;

const NAMES = `swiggy zomato flipkart phonepe razorpay cred meesho groww zerodha upstox paytm policybazaar makemytrip oyo olacabs olaelectric atherenergy rapido zepto blinkit bigbasket nykaa lenskart myntra urbancompany sharechat dailyhunt inmobi glance freshworks chargebee postman browserstack hasura druva icertis darwinbox leadsquared moengage clevertap webengage whatfix mindtickle innovaccer practo pharmeasy tata1mg curefit healthifyme unacademy vedantu physicswallah upgrad scaler simplilearn khatabook okcredit jupiter jupitermoney fi epifi slice sliceit smallcase indmoney coindcx coinswitch acko godigit turtlemint zeta m2pfintech juspay cashfree pinelabs mobikwik bharatpe navi lendingkart ofbusiness udaan zetwerk moglix delhivery shadowfax porter blackbuck cars24 spinny cardekho dream11 games24x7 nazara winzo pocketfm kukufm jiosaavn ixigo cleartrip redbus bookmyshow pepperfry livspace homelane nobroker housing squareyards classplus teachmint leapfinance stashfin kreditbee moneyview perfios signzy idfy hyperverge gupshup haptik yellowai verloop exotel plivo netcore capillary unbxd vymo zluri spotdraft rocketlane sprinto scrut atlan hevodata zenoti instamojo shiprocket cuemath embibe eruditus greatlearning masaischool newtonschool codingninjas geeksforgeeks hackerearth hackerrank unstop apna workindia infoedge instahyre cutshort thoughtworks sprinklr gojek grab shopify hubspot figma canva notion airtable miro zendesk intercom servicenow nvidia qualcomm visa mastercard paypal americanexpress walmart target tesco lowes unilever siemens philips honeywell deloitte publicissapient epam globant thoughtspot rubrik nutanix cohesity commvault netapp paloaltonetworks crowdstrike zscaler okta sumologic newrelic datadog elastic mongodb confluent databricks snowflake tigeranalytics fractal latentview quantiphi sigmoid tredence uber atlassian adobe intuit salesforce linkedin booking agoda expedia wayfair zillow twilio cisco ibm oracle sap dropbox slack asana gitlab github vercel supabase razorpaysoftware swiggyinstamart rippling deel remote multiplier skuad velocity jar fampay junio bharatx open opentech ultrahuman boat boatlifestyle sugarcosmetics mamaearth honasa wakefit licious freshtohome country delight countrydelight dunzo blinkit bluestone caratlane tanishq titan reliance jio airtel tataneu tatadigital bigbasket haptik observeai sarvam krutrim ola`.split(/\s+/).filter(Boolean);

const INDIA = /india|bengaluru|bangalore|mumbai|pune|hyderabad|chennai|gurugram|gurgaon|noida|delhi|kolkata|ahmedabad|coimbatore|kochi|jaipur|chandigarh|indore|thiruvananthapuram/i;

async function j(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
type R = { src: string; total: number; india: number };
const probes: ((n: string) => Promise<R>)[] = [
  (n) => j(`https://boards-api.greenhouse.io/v1/boards/${n}/jobs`).then((d) => ({ src: `gh:${n}`, total: (d.jobs || []).length, india: (d.jobs || []).filter((x: { location?: { name?: string } }) => INDIA.test(x.location?.name || '')).length })),
  (n) => j(`https://api.lever.co/v0/postings/${n}?mode=json&limit=300`).then((d) => { const a = Array.isArray(d) ? d : []; return { src: `lever:${n}`, total: a.length, india: a.filter((x: { categories?: { location?: string; allLocations?: string[] } }) => INDIA.test([x.categories?.location, ...(x.categories?.allLocations || [])].join(' '))).length }; }),
  (n) => j(`https://api.ashbyhq.com/posting-api/job-board/${n}`).then((d) => ({ src: `ashby:${n}`, total: (d.jobs || []).length, india: (d.jobs || []).filter((x: { location?: string; secondaryLocations?: { location?: string }[] }) => INDIA.test([x.location, ...(x.secondaryLocations || []).map((l) => l.location)].join(' '))).length })),
  (n) => j(`https://api.smartrecruiters.com/v1/companies/${n}/postings?country=in&limit=1`).then((d) => ({ src: `sr:${n}`, total: d.totalFound || 0, india: d.totalFound || 0 })),
  (n) => j(`https://apply.workable.com/api/v1/widget/accounts/${n}`).then((d) => ({ src: `workable:${n}`, total: (d.jobs || []).length, india: (d.jobs || []).filter((x: { country?: string; city?: string }) => INDIA.test(`${x.country} ${x.city}`)).length })),
  (n) => j(`https://${n}.recruitee.com/api/offers/`).then((d) => ({ src: `recruitee:${n}`, total: (d.offers || []).length, india: (d.offers || []).filter((x: { location?: string; country?: string }) => INDIA.test(`${x.location} ${x.country}`)).length })),
];

export async function GET() {
  const tasks = NAMES.flatMap((n) => probes.map((p) => () => p(n)));
  const ok: R[] = [];
  for (let i = 0; i < tasks.length; i += 120) {
    const res = await Promise.allSettled(tasks.slice(i, i + 120).map((t) => t()));
    for (const r of res) if (r.status === 'fulfilled' && r.value.india > 0) ok.push(r.value);
  }
  ok.sort((a, b) => b.india - a.india);
  return NextResponse.json({ tried: tasks.length, count: ok.length, totalIndia: ok.reduce((a, b) => a + b.india, 0), ok });
}
