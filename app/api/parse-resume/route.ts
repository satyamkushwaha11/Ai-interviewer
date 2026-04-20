import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PDFParse } from 'pdf-parse';

export const runtime = 'nodejs';

// Next's bundler can't resolve pdfjs's worker at runtime; point pdf-parse at the
// legacy worker on disk so it doesn't try the fake-worker import path.
let workerRegistered = false;
function ensureWorker() {
  if (workerRegistered) return;
  const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
  PDFParse.setWorker(pathToFileURL(workerPath).href);
  workerRegistered = true;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'No file uploaded' }, { status: 400 });
  }
  if (file.type && file.type !== 'application/pdf') {
    return Response.json({ error: 'Only PDF files are supported' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
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
