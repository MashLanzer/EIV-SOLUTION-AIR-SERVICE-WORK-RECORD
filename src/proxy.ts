import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

// /.well-known/assetlinks.json must stay public: Chrome fetches it to verify
// the Android app is allowed to display this site fullscreen.
const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/native-handoff",
  "/.well-known",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!req.auth?.user && !isPublic) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  // The office (admin) app is gated on effective access level, which follows an
  // assigned Position — so an office Position (e.g. Accountant) reaches /admin
  // even with a WORKER base role, while a field Position keeps someone out. Old
  // tokens minted before accessLevel existed fall back to the base role.
  if (req.auth?.user && pathname.startsWith("/admin")) {
    const level =
      req.auth.user.accessLevel ?? (req.auth.user.role === "WORKER" ? "WORKER" : "ADMIN");
    if (level !== "ADMIN") {
      return NextResponse.redirect(new URL("/records", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
