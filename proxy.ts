import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password"];
const PUBLIC_API_ROUTES = ["/api/auth"];

async function getSessionToken(req: NextRequest) {
  return getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
    secureCookie: process.env.NODE_ENV === "production",
  });
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    const token = await getSessionToken(req);
    if (token) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  const token = await getSessionToken(req);

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token.status && token.status !== "active") {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "account_inactive");
    return NextResponse.redirect(url);
  }

  if (
    token.mustChangePassword &&
    !pathname.startsWith("/profile") &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL("/profile", req.url));
  }

  const isSuperAdmin = token.isSuperAdmin as boolean;
  const permissions = (token.permissions as string[]) || [];

  if (!isSuperAdmin) {
    const ROUTE_PERMISSIONS: Record<string, string> = {
      "/patients": "patients:view",
      "/appointments": "appointments:view",
      "/doctors": "doctors:view",
      "/billing": "billing:view",
      "/lab": "lab:view",
      "/labcatalog": "labcatalog:view",
      "/pharmacy": "pharmacy:view",
      "/suppliers": "suppliers:view",
      "/inventory": "inventory:view",
      "/staff": "staff:view",
      "/reports": "reports:view",
      "/users": "users:view",
      "/roles": "roles:view",
      "/audit-logs": "audit_logs:view",
      "/expenses": "expenses:view",
      "/opd": "emr:view",
      "/settings": "settings:view",
    };

    for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
      if (pathname.startsWith(route)) {
        if (!permissions.includes(perm)) {
          return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url));
        }
        break;
      }
    }

    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
      const API_PERMISSIONS: Record<string, string> = {
        "/api/patients": "patients:view",
        "/api/appointments": "appointments:view",
        "/api/doctors": "doctors:view",
        "/api/billing": "billing:view",
        "/api/invoice": "billing:view",
        "/api/lab": "lab:view",
        "/api/labcatalog": "labcatalog:view",
        "/api/pharmacy": "pharmacy:view",
        "/api/supplier": "suppliers:view",
        "/api/inventory": "inventory:view",
        "/api/staff": "staff:view",
        "/api/users": "users:view",
        "/api/roles": "roles:view",
        "/api/audit-logs": "audit_logs:view",
        "/api/reports": "reports:view",
        "/api/expenses": "expenses:view",
        "/api/emr": "emr:view",
        "/api/opd": "emr:view",
        "/api/prescriptions": "prescriptions:view",
        "/api/settings": "settings:view",
        "/api/notifications": "",
      };

      for (const [route, perm] of Object.entries(API_PERMISSIONS)) {
        if (pathname.startsWith(route)) {
          if (perm && !permissions.includes(perm)) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
          }
          break;
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};