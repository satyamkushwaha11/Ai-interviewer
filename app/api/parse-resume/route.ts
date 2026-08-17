import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PDFParse } from 'pdf-parse';
import { errorResponse, handleRouteError, tooManyRequests } from '@/app/lib/apiError';
import { hit } from '@/app/lib/rateLimit';
import { requireUser } from '@/app/lib/requireUser';
import { LIMITS } from '@/app/lib/validate';

export const runtime = 'nodejs';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_BYTES = 10 * 1024 * 1024;

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

/** Extract text from an uploaded PDF/DOCX. Signed-in users only — parsing is CPU-heavy. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const limit = hit(`parse-resume:${auth.id}`, 20, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  // Reject oversize bodies before buffering them; the size check below is the
  // backstop for clients that omit Content-Length.
  const declared = Number(request.headers.get('content-length'));
  if (declared > MAX_BYTES + 64 * 1024) return errorResponse('file_too_large', `${declared} bytes`);

  let file: FormDataEntryValue | null;
  try {
    const form = await request.formData();
    file = form.get('file');
  } catch (err) {
    return handleRouteError('parse-resume/formdata', err);
  }

  if (!(file instanceof File)) {
    return errorResponse('bad_request', 'No file uploaded', 'No file was received. Pick a PDF or DOCX resume.');
  }
  if (file.size === 0) {
    return errorResponse('parse_failed', 'empty file', 'That file is empty. Upload a resume with content.');
  }
  if (file.size > MAX_BYTES) {
    return errorResponse('file_too_large', `${file.size} bytes`);
  }

  const kind = detectKind(file);
  if (!kind) {
    return errorResponse('unsupported_file', file.type || file.name);
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    return handleRouteError('parse-resume/read', err);
  }

  try {
    let text: string;

    if (kind === 'docx') {
      const mammoth = (await import('mammoth')).default;
      const { value } = await mammoth.extractRawText({ buffer });
      text = value.trim();
    } else {
      ensureWorker();
      const parser = new PDFParse({ data: buffer });
      text = (await parser.getText()).text.trim();
    }

    // A scanned/image-only document parses "successfully" but yields nothing —
    // report that as a failure so the user gets an actionable message.
    if (!text) {
      return errorResponse(
        'parse_failed',
        'No text layer found (the document may be a scan or image)',
      );
    }

    // The setup form caps the resume at the same length, so tell the user now
    // rather than silently truncating later.
    return Response.json({
      text: text.slice(0, LIMITS.resume),
      truncated: text.length > LIMITS.resume,
    });
  } catch (err) {
    console.error(`[parse-resume/${kind}]`, err);
    return errorResponse('parse_failed', err instanceof Error ? err.message : undefined);
  }
}
