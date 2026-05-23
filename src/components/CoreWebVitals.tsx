'use client';

import { Card } from '@/components/ui/card';

// The audits object from PageSpeed maps an id (string) to an audit result.
// We only read a few fields, so we type just those — `displayValue` is the
// human string like "2.1 s", `score` is 0..1 (or null for some audits).
interface AuditEntry {
  title: string;
  displayValue?: string;
  score?: number | null;
}

interface Props {
  audits: Record<string, unknown>;
}

// The metrics we want to surface, with the EXACT Lighthouse audit keys.
// Order matters for display. INP is intentionally absent: it can't be measured
// in a single lab run, so we show TBT as its proxy and label it as such.
const METRICS: { key: string; label: string; note?: string }[] = [
  { key: 'largest-contentful-paint', label: 'LCP', note: 'Loading (good < 2.5s)' },
  { key: 'cumulative-layout-shift', label: 'CLS', note: 'Visual stability (good < 0.1)' },
  { key: 'total-blocking-time', label: 'TBT', note: 'INP proxy (lab metric)' },
  { key: 'first-contentful-paint', label: 'FCP', note: 'First paint' },
  { key: 'speed-index', label: 'Speed Index', note: 'Perceived load' },
];

// Lighthouse already scores each metric 0..1 — reuse the same traffic-light logic.
function vitalColor(score?: number | null) {
  if (score == null) return 'text-muted-foreground';
  if (score >= 0.9) return 'text-green-600';
  if (score >= 0.5) return 'text-yellow-600';
  return 'text-red-600';
}

export function CoreWebVitals({ audits }: Props) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-1">Core Web Vitals</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Lab data from this audit. Field data (real users) requires the CrUX API.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {METRICS.map(({ key, label, note }) => {
          // Read the audit by its key. The `as` cast tells TS the shape we expect
          // for the fields we use; the data was already validated in pagespeed.ts.
          const audit = audits[key] as AuditEntry | undefined;
          return (
            <div key={key}>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {label}
              </div>
              <div className={`text-xl font-semibold ${vitalColor(audit?.score)}`}>
                {audit?.displayValue ?? '—'}
              </div>
              {note && <div className="text-[11px] text-muted-foreground mt-0.5">{note}</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}