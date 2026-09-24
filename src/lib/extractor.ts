import mammoth from 'mammoth';
import { extractText } from 'unpdf';

/**
 * Extracts plain text from an uploaded File (TXT, DOCX, PDF).
 * Real text extraction only — never returns placeholder or summary text.
 */
export async function extractResumeText(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  const fileType = file.type;

  // Plain text / Markdown / CSV
  if (
    fileType.startsWith('text/') ||
    fileName.endsWith('.txt') ||
    fileName.endsWith('.md')
  ) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = (reader.result as string) || '';
        if (result.trim().length > 0) {
          resolve(result.trim());
        } else {
          reject(new Error('Uploaded text file is empty.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read text file.'));
      reader.readAsText(file);
    });
  }

  // Word Document (.docx)
  if (
    fileName.endsWith('.docx') ||
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (result.value && result.value.trim().length > 0) {
        return result.value.trim();
      }
    } catch (docxErr) {
      console.warn('[Rolewise] Client DOCX extraction notice:', docxErr);
    }

    // Try server-side extraction fallback
    const serverResult = await tryServerExtraction(file);
    if (serverResult) return serverResult;

    throw new Error('Could not extract text from the DOCX file. Please ensure it contains readable text.');
  }

  // PDF Document (.pdf)
  if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const res = await extractText(bytes);
      const fullText = Array.isArray(res.text) ? res.text.join('\n\n') : String(res.text || '');
      const cleaned = fullText.trim();
      if (cleaned.length > 30) {
        return cleaned;
      }
    } catch (pdfErr) {
      console.warn('[Rolewise] Client PDF extraction notice:', pdfErr);
    }

    // Try server-side extraction fallback
    const serverResult = await tryServerExtraction(file);
    if (serverResult) return serverResult;

    throw new Error('Could not extract text from the PDF file. Please ensure the PDF has readable text (not scanned images) or use the manual experience input.');
  }

  // Generic fallback for other text-based files
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = (reader.result as string) || '';
      if (res.trim().length > 0) {
        resolve(res.trim());
      } else {
        reject(new Error('Uploaded file is empty or unsupported format.'));
      }
    };
    reader.onerror = () => reject(new Error('Unsupported file format.'));
    reader.readAsText(file);
  });
}

async function tryServerExtraction(file: File): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch('/api/resume/extract', {
      method: 'POST',
      body: formData,
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.text && typeof data.text === 'string' && data.text.trim().length > 30) {
        return data.text.trim();
      }
    }
  } catch (err) {
    console.warn('[Rolewise] Server-side extraction fallback failed:', err);
  }
  return null;
}
