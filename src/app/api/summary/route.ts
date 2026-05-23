import { NextRequest } from 'next/server';
import { streamAuditSummary } from '@/lib/openai';

// CRITICAL for Netlify: force the Node.js runtime, not Edge. Netlify supports
// streaming responses from Next route handlers only on the Node runtime.
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { scores, audits } = await req.json();

    // Worst-scoring audits (failed = score < 0.9), trimmed to the fields the model needs.
    const auditMap = audits as Record<string, any>;
    const topIssues = Object.entries(auditMap)
      .filter(([, audit]) => audit.score !== null && audit.score < 0.9)
      .slice(0, 10)
      .map(([id, audit]) => ({
        id,
        title: audit.title as string,
        score: audit.score as number | null,
      }));

    // Core Web Vitals passed explicitly so the model always sees them with their
    // human-readable values. Filter for existence FIRST, then map, so \`null\` never
    // enters the array and TypeScript never infers a \`| null\` member.
    const VITAL_KEYS = [
      'largest-contentful-paint',
      'cumulative-layout-shift',
      'total-blocking-time',
      'first-contentful-paint',
      'speed-index',
    ];
    const vitals = VITAL_KEYS.filter((key) => auditMap[key]).map((key) => {
      const a = auditMap[key];
      return {
        metric: key,
        value: a.displayValue as string | undefined,
        score: a.score as number | null,
      };
    });

    // This call (and the network connection to OpenAI) can throw — auth errors,
    // insufficient quota, bad model name. Those happen BEFORE we return the
    // stream, so the outer catch handles them as a proper 500 with a real message.
    const stream = await streamAuditSummary(scores, topIssues, vitals);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        // Inner try/catch: errors here happen DURING streaming, after the 200
        // header has already been sent. We can't change the status now, so we
        // log it and push a visible marker into the stream, then close cleanly.
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
        } catch (streamErr) {
          console.error('Summary stream failed mid-flight:', streamErr);
          controller.enqueue(
            encoder.encode('\n\n[Summary interrupted — please try again.]')
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    // Setup errors (bad JSON, OpenAI auth/quota/model failures before streaming).
    // console.error prints the REAL cause to your dev-server terminal.
    console.error('Summary route failed:', err);
    const message = err instanceof Error ? err.message : 'Summary generation failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}