'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/card';

interface AuditRow {
  id: number;
  url: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  createdAt: string;
}

interface ChartPoint {
  date: string;
  Performance: number;
  Accessibility: number;
  'Best Practices': number;
  SEO: number;
}

interface Props {
  url: string;
  apiUrl: string;
  refreshKey?: number;
}

export function HistoryChart({ url, apiUrl, refreshKey }: Props) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/api/history?url=${encodeURIComponent(url)}`);
        if (!res.ok) return;
        const rows: AuditRow[] = await res.json();
        if (cancelled) return;
        const points: ChartPoint[] = rows
          .slice()
          .reverse()
          .map((r) => ({
            date: new Date(r.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            }),
            Performance: Math.round(r.performance * 100),
            Accessibility: Math.round(r.accessibility * 100),
            'Best Practices': Math.round(r.bestPractices * 100),
            SEO: Math.round(r.seo * 100),
          }));
        setData(points);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [url, apiUrl, refreshKey]);

  if (!loading && data.length < 2) {
    return (
      <Card className="p-6 bg-white rounded-lg shadow-md border-0">
        <h2 className="text-lg font-semibold mb-1 text-slate-900">Score history</h2>
        <p className="text-sm text-slate-500">
          Run this audit again later to start building a trend. One data point so far.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white rounded-lg shadow-md border-0">
      <h2 className="text-lg font-semibold mb-4 text-slate-900">Score history</h2>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" fontSize={12} stroke="#64748b" />
            <YAxis domain={[0, 100]} fontSize={12} stroke="#64748b" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Performance" stroke="#06b6d4" strokeWidth={2} />
            <Line type="monotone" dataKey="Accessibility" stroke="#2563eb" strokeWidth={2} />
            <Line type="monotone" dataKey="Best Practices" stroke="#d97706" strokeWidth={2} />
            <Line type="monotone" dataKey="SEO" stroke="#7c3aed" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}