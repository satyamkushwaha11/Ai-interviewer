'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary for errors thrown in the root layout itself. It replaces
 * the whole document, so it must render its own <html>/<body> and cannot rely
 * on the app's stylesheet being applied — hence the inline styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#131313',
          color: '#e2e2e2',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          padding: '20px',
        }}
      >
        <div
          style={{
            maxWidth: '32rem',
            width: '100%',
            textAlign: 'center',
            background: 'rgba(45,45,45,0.7)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1.5rem',
            padding: '2.5rem',
          }}
        >
          <h1 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 12px' }}>
            The app failed to start
          </h1>
          <p style={{ color: '#c3caac', lineHeight: 1.6, margin: '0 0 24px' }}>
            A fatal error occurred while loading AI Interviewer. Reloading usually clears it.
          </p>
          {error.message && (
            <p
              style={{
                background: '#1b1b1b',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '0.75rem',
                padding: '12px 16px',
                textAlign: 'left',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '12px',
                color: 'rgba(195,202,172,0.8)',
                wordBreak: 'break-word',
                margin: '0 0 24px',
              }}
            >
              {error.message}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#b9f600',
              color: '#141f00',
              border: 'none',
              borderRadius: '0.75rem',
              padding: '12px 24px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
