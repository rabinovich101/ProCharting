import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionValue,
  getRequestOrigin,
  sanitizeAdminNextPath,
} from "../../../lib/admin-session";
import {
  getActiveAdminCredentials,
  getAdminSessionConfigFromCredentials,
  verifyAdminPassword,
} from "../../../lib/admin-credentials";

export const runtime = "nodejs";

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

interface LoginAttemptState {
  count: number;
  lockedUntil: number;
  resetAt: number;
}

const loginAttempts = new Map<string, LoginAttemptState>();

const getClientAddress = (request: NextRequest): string => {
  const cloudflareAddress = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareAddress) {
    return cloudflareAddress;
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedFor) {
    return forwardedFor;
  }

  return "unknown";
};

const getAttemptKey = (request: NextRequest, username: string): string =>
  `${getClientAddress(request)}:${username.trim().toLowerCase() || "empty"}`;

const pruneAttempts = (now: number) => {
  for (const [key, state] of loginAttempts) {
    if (state.resetAt < now && state.lockedUntil < now) {
      loginAttempts.delete(key);
    }
  }
};

const isLockedOut = (key: string, now: number): boolean => {
  const state = loginAttempts.get(key);
  return Boolean(state && state.lockedUntil > now);
};

const recordFailedAttempt = (key: string, now: number) => {
  const current = loginAttempts.get(key);
  const state =
    current && current.resetAt > now
      ? current
      : {
          count: 0,
          lockedUntil: 0,
          resetAt: now + ATTEMPT_WINDOW_MS,
        };

  state.count += 1;
  if (state.count >= MAX_FAILED_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_MS;
    state.resetAt = state.lockedUntil;
  }

  loginAttempts.set(key, state);
};

const clearFailedAttempts = (key: string) => {
  loginAttempts.delete(key);
};

const createLoginRedirect = (request: NextRequest, error: string, nextPath: string) => {
  const redirectUrl = new URL("/admin", getRequestOrigin(request.headers, request.url));
  redirectUrl.searchParams.set("error", error);
  redirectUrl.searchParams.set("next", sanitizeAdminNextPath(nextPath));
  return NextResponse.redirect(redirectUrl, { status: 303 });
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = sanitizeAdminNextPath(formData.get("next"));
  const adminCredentials = await getActiveAdminCredentials();

  if (!adminCredentials) {
    return createLoginRedirect(request, "config", nextPath);
  }

  const now = Date.now();
  pruneAttempts(now);

  const attemptKey = getAttemptKey(request, username);
  if (isLockedOut(attemptKey, now)) {
    return createLoginRedirect(request, "rate", nextPath);
  }

  if (username !== adminCredentials.username || !(await verifyAdminPassword(password, adminCredentials))) {
    recordFailedAttempt(attemptKey, now);
    return createLoginRedirect(request, "credentials", nextPath);
  }

  clearFailedAttempts(attemptKey);
  const sessionValue = await createAdminSessionValue(getAdminSessionConfigFromCredentials(adminCredentials), now);
  const response = NextResponse.redirect(new URL(nextPath, getRequestOrigin(request.headers, request.url)), { status: 303 });
  response.cookies.set(ADMIN_SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/admin",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
