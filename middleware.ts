import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Note: Can't import logger directly here due to edge runtime limitations
// Logging will be done in a separate server-side component

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add request ID header for tracking
  response.headers.set('x-request-id', crypto.randomUUID());
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

