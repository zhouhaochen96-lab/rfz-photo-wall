import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicRoutes = ["/login", "/reset-password", "/update-password"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  )

  const hasAuthCookie =
    request.cookies.getAll().some((cookie) =>
      cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")
    )

  if (!isPublicRoute && !hasAuthCookie) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/members/:path*",
    "/upload/:path*",
    "/timeline/:path*",
    "/wall/:path*",
    "/walls/:path*",
  ],
}