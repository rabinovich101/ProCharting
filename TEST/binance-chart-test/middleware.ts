import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  getRequestOrigin,
  getAdminRuntimeConfig,
  sanitizeAdminNextPath,
  verifyAdminSessionValue,
} from "./lib/admin-session";

interface BasicCredentials {
  username: string;
  password: string;
}

const decodeBasicCredentials = (authorizationHeader: string | null): BasicCredentials | null => {
  if (!authorizationHeader?.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = atob(authorizationHeader.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
};

const createUnauthorizedResponse = () =>
  new NextResponse("Authentication required.", {
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Basic realm="ProCharting Admin", charset="UTF-8"',
    },
    status: 401,
  });

const createNoStoreResponse = () => {
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  return response;
};

const isPublicAdminPath = (pathname: string): boolean =>
  pathname === "/admin" || pathname === "/admin/login" || pathname === "/admin/logout";

const createAdminLoginRedirect = (request: NextRequest) => {
  const redirectUrl = new URL("/admin", getRequestOrigin(request.headers, request.url));
  redirectUrl.searchParams.set("next", sanitizeAdminNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`));
  return NextResponse.redirect(redirectUrl);
};

export async function middleware(request: NextRequest) {
  if (isPublicAdminPath(request.nextUrl.pathname)) {
    return createNoStoreResponse();
  }

  const adminConfig = getAdminRuntimeConfig();

  if (!adminConfig) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (await verifyAdminSessionValue(sessionCookie, adminConfig)) {
    return createNoStoreResponse();
  }

  const credentials = decodeBasicCredentials(request.headers.get("authorization"));
  if (credentials?.username === adminConfig.username && credentials.password === adminConfig.password) {
    return createNoStoreResponse();
  }

  if (request.headers.get("accept")?.includes("text/html")) {
    return createAdminLoginRedirect(request);
  }

  return createUnauthorizedResponse();
}

export const config = {
  matcher: ["/admin/:path*"],
};
