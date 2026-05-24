import OpenAI from 'openai';

// This file only ever runs on the SERVER — imported by a route handler, never
// by a 'use client' component. That's how OPENAI_API_KEY stays out of the browser.
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function streamAuditSummary(
  scores: Record<string, { score: number }>,
  topIssues: Array<{ id: string; title: string; score: number | null }>,
  vitals: Array<{ metric: string; value?: string; score?: number | null }>
) {
  return client.chat.completions.create({
    model: 'gpt-5.4-mini',
    stream: true,
    max_completion_tokens: 600,
    messages: [
      {
        role: 'system',
        content: `You are a senior web consultant. You are given Lighthouse audit scores, the site's Core Web Vitals, and the top failing audits. Write a short, plain-English summary (under 250 words) covering:
1. Overall verdict in one sentence.
2. The 3 highest-impact fixes, with brief reasoning.
3. One thing the site is doing well.
4. Comment specifically on the Core Web Vitals (LCP, CLS, TBT), noting which are in good range and which need work.

No jargon. No nested bullet lists. Write like you are explaining it to the business owner over coffee.`,
      },
      {
        role: 'user',
        content: `Scores: ${JSON.stringify(scores)}

Core Web Vitals: ${JSON.stringify(vitals)}

Top failing audits: ${JSON.stringify(topIssues)}`,
      },
    ],
  });
}