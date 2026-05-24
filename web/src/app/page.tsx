'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { AuditResults } from '@/components/AuditResults';
import { CoreWebVitals } from '@/components/CoreWebVitals';
import { HistoryChart } from '@/components/HistoryChart';

interface AuditResponse {
  url: string;
  scores: Record<string, number>;
  vitals: Record<string, { displayValue: string; score: number | null }>;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5188';

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Audit failed');
      setResult(data as AuditResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container mx-auto max-w-3xl py-16 px-4">
      <h1 className="text-4xl font-bold mb-2 text-slate-900">Site Analyser</h1>
      <p className="text-slate-500 mb-8">Paste a URL. Get an honest audit.</p>

      <div className="flex gap-2 mb-8">
        <Input
          type="url"
          placeholder="enter a url like 'https://www.example.com'"
          value={url}
          onChange={(e: { target: { value: string } }) => setUrl(e.target.value)}
          onKeyDown={(e: { key: string }) => {
            if (e.key === 'Enter' && url && !loading) handleSubmit();
          }}
        />
        <Button
          className="bg-brand-600 hover:bg-brand-700 text-white"
          onClick={handleSubmit}
          disabled={loading || !url}
        >
          {loading ? 'Auditing…' : 'Audit'}
        </Button>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      {result && (
        <div className="space-y-6 fade-in-up">
          <AuditResults scores={result.scores} vitals={result.vitals} apiUrl={API_URL} />
          <CoreWebVitals vitals={result.vitals} />
          <HistoryChart url={result.url} apiUrl={API_URL} />
        </div>
      )}
    </main>
  );
}