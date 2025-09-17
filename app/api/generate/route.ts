import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const generateSchema = z.object({
  prompt: z.string().min(1).max(1000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = generateSchema.parse(body);

    // TODO: Rate limiting
    // TODO: Moderation check
    // TODO: Cache check
    // TODO: Enqueue job
    console.log('Generate request for prompt:', prompt);

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({ jobId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
