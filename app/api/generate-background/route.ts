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


    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Replicate API token not configured' },
        { status: 500 }
      );
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const MODEL_NAME = "black-forest-labs/flux-1.1-pro";
    
    const output = await replicate.run(
      MODEL_NAME,
      {
        input: {
          prompt: `${prompt}, high quality, detailed, background, 4k, cinematic lighting`,
          prompt_upsampling: true,
          safety_tolerance: 6,
        }
      }
    );

    // Handle Flux 1.1 Pro output format
    let imageUrl: string;
    
    if (output && typeof output === 'object' && 'url' in output && typeof (output as { url: () => string }).url === 'function') {
      // Flux 1.1 Pro returns an object with url() method
      imageUrl = (output as { url: () => string }).url();
    } else if (output && typeof output === 'object' && 'href' in output) {
      // Handle URL object directly
      imageUrl = (output as { href: string }).href;
    } else if (Array.isArray(output)) {
      imageUrl = output[0];
    } else if (typeof output === 'string') {
      imageUrl = output;
    } else {
      throw new Error('Unexpected response format from image generation service');
    }

    // Convert URL object to string if needed
    if (imageUrl && typeof imageUrl === 'object' && 'href' in imageUrl) {
      imageUrl = (imageUrl as { href: string }).href;
    }

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
