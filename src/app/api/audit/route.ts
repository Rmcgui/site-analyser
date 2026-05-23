import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchPageSpeedData } from '@/lib/pagespeed';

// Route Handler ≈ Nitro's defineEventHandler. Web-standard Request/Response.
// Blog note: this is the conceptual twin of your Nuxt server/api/*.ts files.

const RequestSchema = z.object({ url: z.string().url() });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = RequestSchema.parse(body);
    const data = await fetchPageSpeedData(url);

    return NextResponse.json({
      scores: data.lighthouseResult.categories,
      audits: data.lighthouseResult.audits,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: err.issues },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
