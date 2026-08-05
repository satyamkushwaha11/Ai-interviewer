import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PDFParse } from 'pdf-parse';

export const runtime = 'nodejs';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Next's bundler can't resolve pdfjs's worker at runtime; point pdf-parse at the
// legacy worker on disk so it doesn't try the fake-worker import path.
let workerRegistered = false;
function ensureWorker() {
  if (workerRegistered) return;
  const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
  PDFParse.setWorker(pathToFileURL(workerPath).href);
  workerRegistered = true;
}

/** Browsers are inconsistent about MIME types, so fall back to the extension. */
function detectKind(file: File): 'pdf' | 'docx' | null {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (file.type === DOCX_MIME || name.endsWith('.docx')) return 'docx';
  return null;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const kind = detectKind(file);
  if (!kind) {
    return Response.json(
      { error: 'Only PDF and DOCX files are supported' },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (kind === 'docx') {
    try {
      const mammoth = (await import('mammoth')).default;
      const { value } = await mammoth.extractRawText({ buffer });
      return Response.json({ text: value.trim() });
    } catch (err) {
      return Response.json(
        { error: 'Failed to parse DOCX', detail: (err as Error).message },
        { status: 500 }
      );
    }
  }

  try {
    ensureWorker();
    const parser = new PDFParse({ data: buffer });
    const { text } = await parser.getText();
    return Response.json({ text: text.trim() });
  } catch (err) {
    return Response.json(
      { error: 'Failed to parse PDF', detail: (err as Error).message },
      { status: 500 }
    );
  }
}
