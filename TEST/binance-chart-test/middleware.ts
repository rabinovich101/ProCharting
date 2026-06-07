import { NextRequest, NextResponse } from "next/server";

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

export function middleware(request: NextRequest) {
  const adminUsername = process.env.PROCHARTS_ADMIN_USERNAME;
  const adminPassword = process.env.PROCHARTS_ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    return NextResponse.next();
  }

  const credentials = decodeBasicCredentials(request.headers.get("authorization"));
  if (credentials?.username === adminUsername && credentials.password === adminPassword) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  return createUnauthorizedResponse();
}

export const config = {
  matcher: ["/admin/:path*"],
};
