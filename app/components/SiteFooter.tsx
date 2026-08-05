import Link from 'next/link';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Start a mock interview', href: '/interview' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/5 bg-surface-container-low/40">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-10 px-5 py-14 md:grid-cols-4 md:px-16">
        <div className="col-span-2 md:col-span-1">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="font-display text-headline-md font-bold tracking-tight text-primary-fixed">
              Interviewly
            </span>
          </div>
          <p className="max-w-xs text-body-md leading-relaxed text-on-surface-variant/70">
            Realistic AI mock interviews that probe, follow up, and grade you like a hiring manager
            would.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="mb-4 font-display text-label-sm uppercase tracking-widest text-on-surface-variant">
              {col.title}
            </h3>
            <ul className="space-y-3">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-label-md text-on-surface-variant/70 transition-colors hover:text-primary-fixed"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-5 py-6 font-display text-label-sm text-on-surface-variant/60 sm:flex-row md:px-16">
          <span>© {2026} Interviewly. All rights reserved.</span>
          <span>Built for candidates who want the real thing.</span>
        </div>
      </div>
    </footer>
  );
}
