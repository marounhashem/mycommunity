import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth required
  const publicPaths = ["/login", "/set-password", "/api/auth", "/api/health", "/api/debug"];
  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  const token = await getToken({ req: request });

  // Unauthenticated + protected route → login
  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated + needs password + not on set-password → set-password
  if (token?.needsPassword && pathname !== "/set-password") {
    return NextResponse.redirect(new URL("/set-password", request.url));
  }

  // Authenticated + on login → redirect to role dashboard
  if (token && pathname === "/login") {
    const dashboardPath = getDashboardPath(token.role as string);
    return NextResponse.redirect(new URL(dashboardPath, request.url));
  }

  // Role-based route group checks
  if (token && !isPublic) {
    const role = token.role as string;

    if (pathname.startsWith("/owner") && role !== "OWNER") {
      return NextResponse.redirect(
        new URL(getDashboardPath(role), request.url)
      );
    }

    if (
      pathname.startsWith("/manager") &&
      role !== "MANAGER" &&
      role !== "ADMIN"
    ) {
      return NextResponse.redirect(
        new URL(getDashboardPath(role), request.url)
      );
    }

    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(
        new URL(getDashboardPath(role), request.url)
      );
    }
  }

  return NextResponse.next();
}

function getDashboardPath(role: string): string {
  switch (role) {
    case "OWNER":
      return "/owner/dashboard";
    case "MANAGER":
      return "/manager/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return "/login";
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
