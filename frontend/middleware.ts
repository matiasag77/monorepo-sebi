import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const isAdmin = req.auth?.user?.role === "admin"

  // Public paths
  const publicPaths = ["/login", "/api/auth"]
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  // Redirect authenticated users away from login
  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/chat", req.url))
  }

  // Allow public paths
  if (isPublicPath) {
    return NextResponse.next()
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin routes protection
  if (pathname.startsWith("/admin") && !isAdmin) {
    return NextResponse.redirect(new URL("/chat", req.url))
  }

  // Redirect root to chat
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/chat", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}
