import { NextResponse, type NextRequest } from 'next/server'

function hasSession(request: NextRequest): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return false
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const key = `sb-${projectRef}-auth-token`
  return request.cookies.has(key) || request.cookies.has(`${key}.0`)
}

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith('/dashboard') &&
    !hasSession(request)
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
