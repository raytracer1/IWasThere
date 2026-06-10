import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/result", "/history", "/admin"];

export default auth((req) => {
  if (process.env.NODE_ENV === "development") return NextResponse.next();
  const isLoggedIn = !!req.auth;
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isPublicAsset =
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/favicon") ||
    req.nextUrl.pathname.match(/\.(svg|png|jpg|jpeg|gif|ico)$/);
  const isProtected = protectedRoutes.some(r => req.nextUrl.pathname.startsWith(r));

  // Allow public assets and auth routes
  if (isPublicAsset || isAuthRoute) {
    return NextResponse.next();
  }

  // Redirect to login only for protected routes when not authenticated
  if (!isLoggedIn && isProtected) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect to home if already logged in and on login page
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
