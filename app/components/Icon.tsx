import type { SVGProps } from 'react';

/**
 * Outline icon set standing in for Material Symbols Outlined.
 * Material Symbols is not available through `next/font/google`, so these are
 * inlined as SVG to keep the design system self-hosted (no external stylesheet,
 * no ligature flash-of-text before the icon font loads).
 */
export type IconName =
  | 'mic'
  | 'stop'
  | 'keyboard'
  | 'phone-off'
  | 'call-end'
  | 'close'
  | 'check'
  | 'check-circle'
  | 'play-circle'
  | 'replay'
  | 'chat'
  | 'analysis'
  | 'spark'
  | 'bot'
  | 'upload'
  | 'sliders'
  | 'menu'
  | 'arrow-right'
  | 'arrow-left'
  | 'doc'
  | 'code'
  | 'trending'
  | 'chart'
  | 'target'
  | 'send';

const PATHS: Record<IconName, React.ReactNode> = {
  mic: (
    <>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3M8.5 21h7" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2.5" />,
  keyboard: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" />
    </>
  ),
  'phone-off': (
    <>
      <path d="M15.5 21A13.5 13.5 0 0 1 3 8.5 2 2 0 0 1 5 6.5h2.2a1.5 1.5 0 0 1 1.5 1.3c.1.9.3 1.7.6 2.5a1.5 1.5 0 0 1-.4 1.6L7.8 13a12 12 0 0 0 3.2 3.2l1.1-1.1a1.5 1.5 0 0 1 1.6-.4c.8.3 1.6.5 2.5.6a1.5 1.5 0 0 1 1.3 1.5V19a2 2 0 0 1-2 2z" />
      <path d="M3 3l18 18" />
    </>
  ),
  // Filled (see FILLED set) — the outline version reads as a muddle at 20px.
  'call-end': (
    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M4.5 12.5l5 5 10-10" />,
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.2l2.8 2.8L16 9.8" />
    </>
  ),
  'play-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10.2 8.6l5.6 3.4-5.6 3.4z" />
    </>
  ),
  replay: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v4h-4" />
    </>
  ),
  chat: <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />,
  analysis: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7 12h2l2-4 2 8 2-4h2" />
    </>
  ),
  spark: (
    <>
      <path d="M11 3l1.7 4.3L17 9l-4.3 1.7L11 15l-1.7-4.3L5 9l4.3-1.7z" />
      <path d="M18 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </>
  ),
  bot: (
    <>
      <rect x="4" y="8" width="16" height="11" rx="3" />
      <path d="M12 8V5" />
      <circle cx="12" cy="3.8" r="1.3" />
      <path d="M9 13h.01M15 13h.01M2 12v3M22 12v3" />
    </>
  ),
  upload: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M12 18v-6M9.5 14.5L12 12l2.5 2.5" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h9M19 7h1M4 12h3M13 12h7M4 17h9M19 17h1" />
      <circle cx="16" cy="7" r="2.2" />
      <circle cx="10" cy="12" r="2.2" />
      <circle cx="16" cy="17" r="2.2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  'arrow-right': <path d="M4 12h15M13 6l6 6-6 6" />,
  'arrow-left': <path d="M20 12H5M11 6l-6 6 6 6" />,
  doc: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  code: <path d="M8 6l-6 6 6 6M16 6l6 6-6 6M13.5 4l-3 16" />,
  trending: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" />
    </>
  ),
  send: <path d="M21 3L10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8z" />,
};

/** Icons drawn as solid shapes rather than strokes. */
const FILLED = new Set<IconName>(['call-end']);

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  className?: string;
}

export default function Icon({ name, className = 'w-5 h-5', ...rest }: Props) {
  const filled = FILLED.has(name);
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={filled ? undefined : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
