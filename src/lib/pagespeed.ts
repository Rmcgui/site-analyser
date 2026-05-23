import { z } from 'zod';

/**
 * Lighthouse category scores come back as 0..1 floats. We keep them as-is here
 * and convert to 0..100 in the UI. Each category is .optional() because PageSpeed
 * occasionally omits one if the run partially fails — we'd rather render three
 * scores than throw on a missing fourth.
 */
const PageSpeedResultSchema = z.object({
  lighthouseResult: z.object({
    categories: z.object({
      performance: z.object({ score: z.number() }).optional(),
      accessibility: z.object({ score: z.number() }).optional(),
      'best-practices': z.object({ score: z.number() }).optional(),
      seo: z.object({ score: z.number() }).optional(),
    }),
    audits: z.record(
      z.string(),
      z.object({
        title: z.string(),
        description: z.string().optional(),
        score: z.number().nullable().optional(),
        displayValue: z.string().optional(),
      })
    ),
  }),
});

export type PageSpeedResult = z.infer<typeof PageSpeedResultSchema>;

export async function fetchPageSpeedData(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
) {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) throw new Error('PAGESPEED_API_KEY not set');

  const endpoint = new URL(
    'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
  );
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('key', apiKey);
  endpoint.searchParams.set('strategy', strategy);
  ['performance', 'accessibility', 'best-practices', 'seo'].forEach((c) =>
    endpoint.searchParams.append('category', c)
  );

  const res = await fetch(endpoint.toString(), { next: { revalidate: 3600 } });

  // FIX over the plan: surface PageSpeed's own error body. When the target URL
  // is unreachable, PageSpeed returns a 4xx/5xx with a JSON {error:{message}}.
  // Without this, you get a useless "PageSpeed API 400" and a 20-minute debug.
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message ? ` — ${body.error.message}` : '';
    } catch {
      /* non-JSON error body, ignore */
    }
    throw new Error(`PageSpeed API ${res.status}${detail}`);
  }

  const raw = await res.json();
  return PageSpeedResultSchema.parse(raw);
}
