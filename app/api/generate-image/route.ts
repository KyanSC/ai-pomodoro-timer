import { NextRequest, NextResponse } from 'next/server';


const generateImageSchema = {
  prompt: (value: unknown) => {
    if (typeof value !== 'string') return 'Prompt must be a string';
    const trimmed = value.trim();
    if (trimmed.length < 3) return 'Prompt must be at least 3 characters';
    if (trimmed.length > 300) return 'Prompt must be no more than 300 characters';
    // Strip control characters
    const cleaned = trimmed.replace(/[\x00-\x1F\x7F]/g, '');
    if (cleaned !== trimmed) return 'Prompt contains invalid characters';
    return null;
  },
  aspectRatio: (value: unknown) => {
    if (value && typeof value !== 'string') return 'Aspect ratio must be a string';
    return null;
  },
  outputFormat: (value: unknown) => {
    if (value && typeof value !== 'string') return 'Output format must be a string';
    return null;
  },
  outputQuality: (value: unknown) => {
    if (value && (typeof value !== 'number' || value < 1 || value > 100)) {
      return 'Output quality must be a number between 1 and 100';
    }
    return null;
  },
  safetyTolerance: (value: unknown) => {
    if (value && (typeof value !== 'number' || value < 1 || value > 6)) {
      return 'Safety tolerance must be a number between 1 and 6';
    }
    return null;
  }
};

function validateInput(body: Record<string, unknown>) {
  const errors: string[] = [];
  
  for (const [key, validator] of Object.entries(generateImageSchema)) {
    const error = validator(body[key]);
    if (error) errors.push(error);
  }
  
  return errors.length > 0 ? errors : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationErrors = validateInput(body);
    if (validationErrors) {
      return NextResponse.json(
        { error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Check required environment variables
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'REPLICATE_API_TOKEN environment variable is required' },
        { status: 500 }
      );
    }

    // Get model ID from env or use default
    const modelId = process.env.REPLICATE_MODEL_ID || 'black-forest-labs/flux-1.1-pro';
    
    // Get default values from environment
    const defaultAspect = process.env.REPLICATE_DEFAULT_ASPECT || '16:9';
    const defaultFormat = process.env.REPLICATE_DEFAULT_FORMAT || 'webp';
    const defaultQuality = parseInt(process.env.REPLICATE_DEFAULT_QUALITY || '80');
    const defaultSafety = parseInt(process.env.REPLICATE_DEFAULT_SAFETY || '6');

    // Prepare input parameters
    const input = {
      prompt: body.prompt.trim().replace(/[\x00-\x1F\x7F]/g, ''),
      aspect_ratio: body.aspectRatio || defaultAspect,
      output_format: body.outputFormat || defaultFormat,
      output_quality: body.outputQuality || defaultQuality,
      safety_tolerance: body.safetyTolerance || defaultSafety,
    };

    // Create prediction using Replicate's HTTP REST API
    const predictionResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        input: input,
      }),
    });

    if (!predictionResponse.ok) {
      const errorData = await predictionResponse.json().catch(() => ({}));
      throw new Error(`Replicate API error: ${predictionResponse.status} ${errorData.detail || predictionResponse.statusText}`);
    }

    const prediction = await predictionResponse.json();
    
    if (!prediction.id) {
      throw new Error('Invalid response from Replicate API');
    }

    // Poll for completion with timeout
    const startTime = Date.now();
    const timeout = 60000; // 60 seconds
    
    while (Date.now() - startTime < timeout) {
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to check prediction status: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      
      if (statusData.status === 'succeeded') {
        if (statusData.output && Array.isArray(statusData.output) && statusData.output.length > 0) {
          return NextResponse.json({ imageUrl: statusData.output[0] });
        } else {
          throw new Error('No image URL in successful prediction output');
        }
      } else if (statusData.status === 'failed') {
        throw new Error(`Image generation failed: ${statusData.error || 'Unknown error'}`);
      }
      
      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Timeout reached
    throw new Error('Image generation timed out after 60 seconds');

  } catch (error) {
    console.error('Image generation error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
