import { NextRequest, NextResponse } from 'next/server';
import { extractText } from 'unpdf';
import mammoth from 'mammoth';

export const runtime = 'nodejs';

/**
 * Server-side route handler for extracting text from uploaded resume documents (PDF, DOCX, TXT).
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file was provided.' }, { status: 400 });
    }

    const fileName = (file.name || '').toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    if (fileName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = (result.value || '').trim();
      if (!text) {
        return NextResponse.json({ error: 'Could not extract text from DOCX file.' }, { status: 422 });
      }
      return NextResponse.json({ text });
    }

    if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
      const bytes = new Uint8Array(arrayBuffer);
      const res = await extractText(bytes);
      const fullText = Array.isArray(res.text) ? res.text.join('\n\n') : String(res.text || '');
      const cleaned = fullText.trim();
      if (!cleaned || cleaned.length < 20) {
        return NextResponse.json({ error: 'Extracted PDF text is too short or empty.' }, { status: 422 });
      }
      return NextResponse.json({ text: cleaned });
    }

    // Default text fallback
    const text = new TextDecoder('utf-8').decode(arrayBuffer).trim();
    if (!text) {
      return NextResponse.json({ error: 'File is empty.' }, { status: 422 });
    }
    return NextResponse.json({ text });
  } catch (err: unknown) {
    console.error('[API /api/resume/extract] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to extract text from file.' },
      { status: 500 }
    );
  }
}
