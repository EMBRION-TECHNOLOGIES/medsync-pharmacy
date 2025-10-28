import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Note: Since we're using localStorage for token storage (client-side only),
  // we cannot access the token in server-side middleware. 
  // Authentication checks are handled in the client-side (protected) layout.
  // The middleware only handles route-based redirects.

  // If user is on login page, allow access
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // For all other routes, allow access
  // Authentication is handled in the (protected) layout component
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp).*)',
  ],
};

