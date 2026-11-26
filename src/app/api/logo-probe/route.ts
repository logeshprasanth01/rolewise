import { NextResponse } from 'next/server';
import { logoFor } from '@/lib/job-feed';
export const runtime = 'nodejs';
const NAMES = ['Paytm','Apna','Swiggy','Bosch','Okta','Zscaler','ServiceNow','MongoDB','Databricks','Meesho','Rubrik','Stripe','Hevo Data','Sarvam AI','Sigmoid','Zeta','InMobi','Freshworks','GitLab','Zenoti','Toast','HackerRank','Mindtickle','Grab','Elastic','LinkedIn','Twilio','Agoda','OpenAI','FamPay','Glance','Snowflake','Airbnb','CRED','Druva','Coinbase','Sumo Logic','Commvault','Groww','ixigo','Datadog','SpotDraft','Ubisoft','Samsara','DevRev','Observe.AI','New Relic','Atlan','Unacademy','Instahyre','Pocket FM','Figma','Notion','Wise','Nium','Airwallex','Amazon'];
function pngWidth(b: Uint8Array) { return b[0] === 0x89 && b[1] === 0x50 ? (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19] : -1; }
export async function GET() {
  const out = await Promise.all(NAMES.map(async (n) => {
    try {
      const r = await fetch(logoFor(n)!, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
      const b = new Uint8Array(await r.arrayBuffer());
      return `${n}: ${r.status} ${r.headers.get('content-type')} w=${pngWidth(b)} bytes=${b.length}`;
    } catch (e) { return `${n}: ERR ${String(e).slice(0, 40)}`; }
  }));
  return NextResponse.json(out);
}
