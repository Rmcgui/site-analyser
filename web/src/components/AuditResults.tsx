'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  scores: Record<string, number>;
  vitals: Record<string, { displayValue: string; score: number | null }>;
  apiUrl: string;
}

function scoreColor(score: number) {
  if (score >= 0.9) return 'bg-green-500';
  if (score >= 0.5) return 'bg-amber-500';
  return 'bg-red-500';
}

export function AuditResults({ scores, vitals, apiUrl }: Props) {
  const [summary, setSummary] = useState('');
  const [streaming, setStreaming] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const res = await fetch(`${apiUrl}/api/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores, vitals }),
      });
      if (!res.body) {
        setStreaming(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done || cancelled) break;
        setSummary((prev) => prev + decoder.decode(value));
      }
      if (!cancelled) setStreaming(false);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [scores, vitals, apiUrl]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(scores).map(([key, score]) => (
          <Card key={key} className="p-4 bg-white rounded-lg shadow-md border-0">
            <div className="text-sm text-slate-500 capitalize">
              {key.replace('-', ' ')}
            </div>
            <div className="text-3xl font-bold text-slate-900">{Math.round(score * 100)}</div>
            <div className={`h-1 mt-2 rounded ${scoreColor(score)}`} />
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-white rounded-lg shadow-md border-0">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-900">
          AI Summary
          {streaming && (
            <Badge variant="secondary" className="bg-brand-100 text-brand-700">
              streaming…
            </Badge>
          )}
        </h2>
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700">
          {summary || 'Generating summary…'}
        </div>
      </Card>
    </div>
  );
}