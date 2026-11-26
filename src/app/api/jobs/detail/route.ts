import { NextRequest, NextResponse } from 'next/server';
import sanitizeHtml from 'sanitize-html';
import { jobDetail, levelOf } from '@/lib/job-feed';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** GET /api/jobs/detail?id=&q= → one job with its full, sanitised description. */
export async function GET(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get('id') || '').slice(0, 200);
  const q = (req.nextUrl.searchParams.get('q') || '').slice(0, 80);
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const job = await jobDetail(id, q);
  if (!job) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Third-party HTML: keep structure and links only.
  const cleanHtml = sanitizeHtml(job.descriptionHtml || '', {
    allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 'h2', 'h3', 'h4', 'h5', 'a', 'blockquote'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      h1: 'h3',
      h2: 'h3',
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer nofollow' }),
      div: 'p',
    },
    exclusiveFilter: (frame) => ['p', 'h3', 'h4', 'li'].includes(frame.tag) && !frame.text.trim(),
  });
  const descriptionHtml = bulletsToLists(cleanHtml);
  // Plain text for "Check my fit" (fed into Rolewise's role analysis).
  const descriptionText = sanitizeHtml(
    descriptionHtml.replace(/<\/(p|li|h3|h4|h5)>/g, '\n').replace(/<br\s*\/?>/g, '\n'),
    { allowedTags: [], allowedAttributes: {} }
  )
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return NextResponse.json(
    { job: { ...job, descriptionHtml, descriptionText, level: levelOf(job.title) } },
    { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
  );
}

/**
 * Some postings fake lists with "●", "•" or "-" and <br> line breaks. Turn those paragraphs into
 * real lists so they read like the rest. Runs on already-sanitised HTML.
 */
function bulletsToLists(html: string): string {
  const BULLET = /^\s*(?:[●•▪◦■▸►‣\-–*]|\d{1,2}[.)])\s+/;
  return html.replace(/<p>([\s\S]*?)<\/p>/g, (whole, inner: string) => {
    const lines = inner.split(/<br\s*\/?>/).map((l) => l.trim()).filter(Boolean);
    const bulletLines = lines.filter((l) => BULLET.test(l));
    if (bulletLines.length < 2) return whole;
    let out = '';
    let list: string[] = [];
    const flush = () => {
      if (list.length) out += `<ul>${list.map((l) => `<li>${l}</li>`).join('')}</ul>`;
      list = [];
    };
    for (const l of lines) {
      if (BULLET.test(l)) list.push(l.replace(BULLET, ''));
      else {
        flush();
        out += `<p>${l}</p>`;
      }
    }
    flush();
    return out;
  });
}
