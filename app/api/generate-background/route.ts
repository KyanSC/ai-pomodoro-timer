import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Replicate from 'replicate';

const generateBackgroundSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty').max(500, 'Prompt too long'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = generateBackgroundSchema.parse(body);

    // TODO: Rate limiting
    // TODO: Moderation check
    // TODO: Cache check

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Replicate API token not configured' },
        { status: 500 }
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Use a high-quality image generation model
    // This is a popular model for landscape/background generation
    const output = await replicate.run(
      "stability-ai/stable-diffusion:db21e45d3f7023abc2e46a38a7e4facf9b91b7c6ac8e3a6a13a0143c5db0c24d",
      {
        input: {
          prompt: `${prompt}, high quality, detailed, landscape, background, 4k, cinematic lighting`,
          width: 1920,
          height: 1080,
          num_inference_steps: 20,
          guidance_scale: 7.5,
          num_outputs: 1,
        }
      }
    );

    // Replicate returns an array of URLs
    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Invalid response from image generation service');
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Background generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate background image' },
      { status: 500 }
    );
  }
}
