'use client';

import { Card } from '@/components/ui/card';

interface VitalMetric {
  displayValue: string;
  score: number | null;
}

interface Props {
  vitals: Record<string, VitalMetric>;
}

const METRICS: { key: string; label: string; note: string }[] = [
  { key: 'largest-contentful-paint', label: 'LCP', note: 'Loading (good < 2.5s)' },
  { key: 'cumulative-layout-shift', label: 'CLS', note: 'Visual stability (good < 0.1)' },
  { key: 'total-blocking-time', label: 'TBT', note: 'INP proxy (lab metric)' },
  { key: 'first-contentful-paint', label: 'FCP', note: 'First paint' },
  { key: 'speed-index', label: 'Speed Index', note: 'Perceived load' },
];

function vitalColor(score: number | null | undefined) {
  if (score == null) return 'text-slate-400';
  if (score >= 0.9) return 'text-green-600';
  if (score >= 0.5) return 'text-amber-600';
  return 'text-red-600';
}

export function CoreWebVitals({ vitals }: Props) {
  return (
    <Card className="p-6 bg-white rounded-lg shadow-md border-0">
      <h2 className="text-lg font-semibold mb-1 text-slate-900">Core Web Vitals</h2>
      <p className="text-sm text-slate-500 mb-4">
        Lab data from this audit. Field data (real users) requires the CrUX API.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {METRICS.map(({ key, label, note }) => {
          const metric = vitals?.[key];
          return (
            <div key={key}>
              <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
              <div className={`text-xl font-semibold ${vitalColor(metric?.score)}`}>
                {metric?.displayValue ?? '—'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{note}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}