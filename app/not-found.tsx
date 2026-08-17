import Link from 'next/link';
import Icon from './components/Icon';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-16 text-center">
      <div className="glass-panel relative w-full max-w-lg overflow-hidden rounded-[2rem] p-8 sm:p-10">
        <div className="tech-grid pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col items-center gap-4">
          <span className="badge">404</span>
          <h1 className="font-display text-headline-md text-on-surface">Page not found</h1>
          <p className="max-w-md text-body-md leading-relaxed text-on-surface-variant">
            That page does not exist. Start a mock interview instead.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/interview"
              className="btn-accent flex items-center justify-center gap-2 px-6 py-3 font-display text-label-md"
            >
              Start an interview
              <Icon name="arrow-right" className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="btn-ghost flex items-center justify-center gap-2 px-6 py-3 font-display text-label-md"
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              Back home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
