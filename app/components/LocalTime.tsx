'use client';

/**
 * Renders a timestamp in the viewer's locale and time zone. The server renders
 * its own zone first; the client re-renders with the local one — the
 * `suppressHydrationWarning` covers that expected text difference.
 */
export default function LocalTime({
  iso,
  className,
  dateOnly = false,
}: {
  iso: string;
  className?: string;
  dateOnly?: boolean;
}) {
  const date = new Date(iso);
  const text = Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString(undefined, {
        dateStyle: 'medium',
        ...(dateOnly ? {} : { timeStyle: 'short' }),
      });
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
