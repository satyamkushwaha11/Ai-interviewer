'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Icon, { type IconName } from './Icon';

export type ToastVariant = 'error' | 'success' | 'info' | 'warning';

export interface ToastOptions {
  title?: string;
  /** ms on screen; 0 keeps it until dismissed. Errors default to sticky-ish. */
  duration?: number;
  /** Repeated calls with the same key replace rather than stack. */
  key?: string;
}

interface ToastItem extends Required<Pick<ToastOptions, 'duration'>> {
  id: number;
  key?: string;
  variant: ToastVariant;
  title: string;
  message: string;
}

interface ToastApi {
  toast: (variant: ToastVariant, message: string, opts?: ToastOptions) => void;
  error: (message: string, opts?: ToastOptions) => void;
  success: (message: string, opts?: ToastOptions) => void;
  info: (message: string, opts?: ToastOptions) => void;
  warning: (message: string, opts?: ToastOptions) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_TITLE: Record<ToastVariant, string> = {
  error: 'Something went wrong',
  success: 'Done',
  info: 'Heads up',
  warning: 'Warning',
};

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  error: 9000,
  success: 4000,
  info: 6000,
  warning: 7000,
};

const ICON: Record<ToastVariant, IconName> = {
  error: 'close',
  success: 'check-circle',
  info: 'analysis',
  warning: 'trending',
};

/** Accent rail + icon colour per variant, using the theme tokens. */
const TONE: Record<ToastVariant, { rail: string; icon: string; ring: string }> = {
  error: { rail: 'bg-error', icon: 'text-error', ring: 'border-error/30' },
  success: { rail: 'bg-primary-fixed', icon: 'text-primary-fixed', ring: 'border-primary-fixed/30' },
  info: { rail: 'bg-primary-fixed-dim', icon: 'text-primary-fixed-dim', ring: 'border-white/10' },
  warning: { rail: 'bg-primary-fixed-dim', icon: 'text-primary-fixed-dim', ring: 'border-primary-fixed/25' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (variant: ToastVariant, message: string, opts: ToastOptions = {}) => {
      if (!message) return;
      const id = nextId.current++;
      const duration = opts.duration ?? DEFAULT_DURATION[variant];
      const item: ToastItem = {
        id,
        key: opts.key,
        variant,
        title: opts.title ?? DEFAULT_TITLE[variant],
        message,
        duration,
      };

      setToasts((list) => {
        // Same key replaces, so a retry loop cannot stack ten identical toasts.
        const deduped = opts.key ? list.filter((t) => t.key !== opts.key) : list;
        return [...deduped, item].slice(-4);
      });

      if (duration > 0) {
        timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
      }
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => clearTimeout(t));
      pending.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      error: (m, o) => toast('error', m, o),
      success: (m, o) => toast('success', m, o),
      info: (m, o) => toast('info', m, o),
      warning: (m, o) => toast('warning', m, o),
      dismiss,
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        // Errors are assertive so a screen reader interrupts; the region sits
        // above the session chrome, which uses z-50.
        aria-live="assertive"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-3 p-4 sm:items-end sm:p-6"
      >
        {toasts.map((t) => {
          const tone = TONE[t.variant];
          return (
            <div
              key={t.id}
              role={t.variant === 'error' ? 'alert' : 'status'}
              className={`glass-panel animate-fade-in-up pointer-events-auto flex w-full max-w-md gap-3 overflow-hidden rounded-xl border ${tone.ring} p-4 shadow-2xl`}
            >
              <span className={`-my-4 -ml-4 w-1 flex-none ${tone.rail}`} aria-hidden="true" />
              <Icon name={ICON[t.variant]} className={`mt-0.5 h-5 w-5 flex-none ${tone.icon}`} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-label-md font-semibold text-on-surface">{t.title}</p>
                <p className="mt-1 break-words text-body-md leading-relaxed text-on-surface-variant">
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-1 h-7 w-7 flex-none rounded-full text-on-surface-variant/60 transition-colors hover:bg-white/10 hover:text-on-surface"
              >
                <Icon name="close" className="mx-auto h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Toasts are optional: components used outside the provider (or in tests) get
 * a no-op API rather than throwing.
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  const fallback = useMemo<ToastApi>(
    () => ({
      toast: () => {},
      error: () => {},
      success: () => {},
      info: () => {},
      warning: () => {},
      dismiss: () => {},
    }),
    [],
  );
  return ctx ?? fallback;
}
