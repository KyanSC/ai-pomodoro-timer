import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from './lib/rateLimit';

export async function middleware(request: NextRequest) {
  // Only apply rate limiting to /api/generate
  if (request.nextUrl.pathname === '/api/generate') {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
    try {
      const rateLimitResult = await checkRateLimit(ip);
      
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            resetTime: rateLimitResult.resetTime 
          },
          { status: 429 }
        );
      }

      // Add rate limit headers
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
      
      return response;
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Allow request to proceed if rate limiting fails
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/generate',
};
