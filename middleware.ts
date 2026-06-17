import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Only these paths are accessible without a session
const PUBLIC_PATHS = ['/', '/auth/login', '/auth/callback', '/auth/signup']

// Admin-only paths — authenticated non-admins get redirected to /orders
const ADMIN_ONLY_PATHS = ['/dashboard', '/products', '/analytics', '/team']

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function isAdminOnly(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  let user = null

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data } = await supabase.auth.getUser()
    user = data.user ?? null

    // Redirect authenticated users away from public auth pages
    if (user && (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup'))) {
      return NextResponse.redirect(new URL('/orders', request.url))
    }

    // Allow public paths through
    if (isPublic(pathname)) {
      return supabaseResponse
    }

    // All other paths require authentication
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Admin-only routes: check role
    if (isAdminOnly(pathname)) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/orders', request.url))
      }
    }

    return supabaseResponse
  } catch {
    // If Supabase is unavailable (missing env vars, network error),
    // block all non-public routes to fail safely
    if (isPublic(pathname)) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
