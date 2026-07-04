import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

// /.well-known/assetlinks.json must stay public: Chrome fetches it to verify
// the Android app is allowed to display this site fullscreen.
const PUBLIC_PATHS = ["/login", "/api/auth", "/.well-known"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!req.auth?.user && !isPublic) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (req.auth?.user && pathname.startsWith("/admin") && req.auth.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/records", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
