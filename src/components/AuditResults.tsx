'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  scores: Record<string, { score: number }>;
  audits: Record<string, unknown>;
}

// Maps a 0..1 Lighthouse score to Google's traffic-light colours.
function scoreColor(score: number) {
  if (score >= 0.9) return 'bg-green-500';
  if (score >= 0.5) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function AuditResults({ scores, audits }: Props) {
  // `summary` accumulates the streamed text. `streaming` toggles the badge.
  const [summary, setSummary] = useState('');
  const [streaming, setStreaming] = useState(true);

  // useEffect runs side effects AFTER render. Here the side effect is "go fetch
  // the streamed summary." It runs once when this component first appears (and
  // again if scores/audits change — see the dependency array at the bottom).
  // This is the React analogue of "do something when the component mounts."
  useEffect(() => {
    // Guard flag for the cleanup function. If the component unmounts (or deps
    // change) mid-stream, we must NOT keep calling setSummary on a gone component
    // — React warns about that. `cancelled` lets the loop bail out cleanly.
    let cancelled = false;

    async function run() {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores, audits }),
      });

      // res.body is a ReadableStream. getReader() gives us a reader we pull from.
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder(); // bytes -> string, the inverse of the server's encoder

      // The client-side half of the loop. read() resolves each time a new chunk
      // arrives. { done, value }: done=true when the server called controller.close();
      // value is the Uint8Array of bytes for this chunk.
      while (true) {
        const { done, value } = await reader.read();
        if (done || cancelled) break;
        // Append the decoded text to state. Using the functional form
        // (prev => prev + ...) is important: it builds on the latest value
        // rather than a possibly-stale `summary` captured in this closure.
        setSummary((prev) => prev + decoder.decode(value));
      }
      if (!cancelled) setStreaming(false);
    }

    run();

    // Cleanup: React calls this when the component unmounts or before re-running
    // the effect. Flipping `cancelled` stops the loop from touching dead state.
    return () => {
      cancelled = true;
    };
  }, [scores, audits]); // dependency array: re-run the effect if these change

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(scores).map(([key, cat]) => (
          <Card key={key} className="p-4">
            <div className="text-sm text-muted-foreground capitalize">
              {key.replace('-', ' ')}
            </div>
            <div className="text-3xl font-bold">{Math.round(cat.score * 100)}</div>
            <div className={`h-1 mt-2 rounded ${scoreColor(cat.score)}`} />
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          AI Summary
          {streaming && <Badge variant="secondary">streaming…</Badge>}
        </h2>
        <div className="prose prose-sm max-w-none whitespace-pre-wrap">
          {summary || 'Generating summary…'}
        </div>
      </Card>
    </div>
  );
}