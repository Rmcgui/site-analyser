'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { AuditResults } from '@/components/AuditResults';
import { CoreWebVitals } from '@/components/CoreWebVitals';

// Day 1 is plumbing only: paste URL → see raw JSON. No styling, no AI yet. 
// Blog note: 'use client' is the big mental-model shift from Vue. Everything
// is a Server Component by default; you opt INTO client interactivity per file.
// useState requires it.

interface AuditResponse {
  scores: Record<string, { score: number }>;
  audits: Record<string, unknown>;
}

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
      const res = await fetch('/api/audit', {
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
      <h1 className="text-4xl font-bold mb-2">Site Analyser</h1>
      <p className="text-muted-foreground mb-8">Paste a URL to audit.</p>

      <div className="flex gap-2 mb-8">
        <Input
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && url && !loading) handleSubmit();
          }}
        />
        <Button onClick={handleSubmit} disabled={loading || !url}>
          {loading ? 'Auditing...' : 'Audit'}
        </Button>
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      {result && (
        <div className="space-y-6">
          <AuditResults scores={result.scores} audits={result.audits} />
          <CoreWebVitals audits={result.audits} />
        </div>
      )}
    </main>
  );
}
