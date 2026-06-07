import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getRequestOrigin } from "../../../lib/admin-session";

const createLogoutResponse = (request: Request) => {
  const response = NextResponse.redirect(new URL("/admin?loggedOut=1", getRequestOrigin(request.headers, request.url)), {
    status: 303,
  });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/admin",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
};

export function GET(request: Request) {
  return createLogoutResponse(request);
}

export function POST(request: Request) {
  return createLogoutResponse(request);
}
