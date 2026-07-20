import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { scanActions, ScanStatusPanel } from './ScanDetail.jsx';

describe('scan lifecycle actions', () => {
  it('offers stop controls without allowing active deletion', () => {
    expect(scanActions('running')).toMatchObject({
      canPause: true,
      canStop: true,
      canDelete: false,
    });
    expect(scanActions('queued')).toMatchObject({
      canStop: true,
      stopLabel: 'Cancel',
      canDelete: false,
    });
    expect(scanActions('rate_limited')).toMatchObject({
      canStop: true,
      stopLabel: 'Stop retrying',
    });
  });

  it('allows safe terminal and paused deletion', () => {
    expect(scanActions('paused')).toMatchObject({
      canResume: true,
      canStop: true,
      canDelete: true,
    });
    expect(scanActions('failed')).toMatchObject({
      canResume: true,
      canDelete: true,
    });
    expect(scanActions('stopped')).toMatchObject({
      canResume: true,
      canDelete: true,
    });
    expect(scanActions('completed')).toMatchObject({
      canResume: false,
      canDelete: true,
    });
  });
});

describe('resumed scan error history', () => {
  it('keeps previous-run errors visible but muted and out of the current failure count', () => {
    const html = renderToStaticMarkup(
      createElement(ScanStatusPanel, {
        scan: {
          statusSummary: {
            totalAttempts: 1,
            currentFailedAttempts: 0,
            recentErrors: [
              {
                id: 'old-1',
                previousRun: true,
                source: 'Workflow',
                title: 'Step 1',
                phaseLabel: 'Failed',
                message: 'Old provider failure',
                knownError: {
                  title: 'Provider limit',
                  fixLinks: [{ label: 'Fix account', url: 'https://example.com' }],
                },
              },
            ],
          },
        },
      })
    );

    expect(html).toContain('Previous run');
    expect(html).toContain('Old provider failure');
    expect(html).not.toContain('Provider limit');
    expect(html).not.toContain('Fix account');
  });

  it('renders all five server-provided failure causes', () => {
    const html = renderToStaticMarkup(
      createElement(ScanStatusPanel, {
        scan: {
          statusSummary: {
            recentErrors: Array.from({ length: 5 }, (_, index) => ({
              id: `error-${index}`,
              source: 'Workflow',
              title: `Step ${index}`,
              phaseLabel: 'Failed',
              message: `Provider failure ${index}`,
            })),
          },
        },
      })
    );

    expect(html).toContain('Provider failure 4');
  });

  it('links account quota errors to usage and provider limits in Accounts', () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(ScanStatusPanel, {
          scan: {
            status: 'rate_limited',
            statusSummary: {
              recentErrors: [
                {
                  id: 'quota-1',
                  source: 'Workflow',
                  title: 'Step 54',
                  phaseLabel: 'Interrupted',
                  message: 'Account quota exhausted.',
                  knownError: {
                    title: 'Account quota exhausted',
                    fixLinks: [
                      {
                        label: 'View usage and limits in Accounts',
                        url: '/accounts',
                        internal: true,
                      },
                    ],
                  },
                },
              ],
            },
          },
        })
      )
    );

    expect(html).toContain('href="/accounts"');
    expect(html).toContain('View usage and limits in Accounts');
  });

  it('shows when each status error occurred', () => {
    const occurredAt = '2026-07-20T10:55:05.000Z';
    const label = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date(occurredAt));
    const html = renderToStaticMarkup(
      createElement(ScanStatusPanel, {
        scan: {
          statusSummary: {
            recentErrors: [
              {
                id: 'timestamped-error',
                source: 'Workflow',
                title: 'Step 1',
                phaseLabel: 'Failed',
                message: 'Provider failure',
                insertedAt: '2026-07-20T10:54:00.000Z',
                updatedAt: occurredAt,
              },
            ],
          },
        },
      })
    );

    expect(html).toContain(`<time dateTime="${occurredAt}"`);
    expect(html).toContain(label);
  });

  it('presents retained rate-limit attempt errors without a failed-scan label', () => {
    const html = renderToStaticMarkup(
      createElement(ScanStatusPanel, {
        scan: {
          status: 'rate_limited',
          statusSummary: {
            totalAttempts: 3,
            currentFailedAttempts: 3,
            recentErrors: [],
          },
        },
      })
    );

    expect(html).toContain('Attempt errors');
    expect(html).not.toContain('>Failed<');
  });
});
