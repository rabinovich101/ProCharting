import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TrackingEventType = "session_seen" | "sign_in" | "sign_up" | "token_refreshed" | "sign_out";

interface TrackingConfig {
  fingerprintSalt: string;
  serviceRoleKey: string;
  supabaseUrl: string;
}

interface TrackingPayload {
  browserContext?: unknown;
  deviceId?: unknown;
  eventType?: unknown;
}

interface JwtClaims {
  session_id?: unknown;
  sid?: unknown;
}

const TRACKING_EVENT_TYPES = new Set<TrackingEventType>([
  "session_seen",
  "sign_in",
  "sign_up",
  "token_refreshed",
  "sign_out",
]);
const FINGERPRINT_VERSION = "local-device-id-v1";
const TRACKING_CLIENT_INFO = "procharting-user-tracking";

const getFirstEnv = (...names: string[]): string | null => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
};

const getTrackingConfig = (): TrackingConfig | null => {
  const supabaseUrl = getFirstEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getFirstEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    fingerprintSalt: getFirstEnv("PROCHARTS_TRACKING_SALT", "PROCHARTING_TRACKING_SALT") ?? serviceRoleKey,
    serviceRoleKey,
    supabaseUrl,
  };
};

const createAdminClient = (config: TrackingConfig) =>
  createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": TRACKING_CLIENT_INFO,
      },
    },
  });

const normalizeTrackingEventType = (value: unknown): TrackingEventType | null => {
  if (typeof value !== "string") {
    return null;
  }

  return TRACKING_EVENT_TYPES.has(value as TrackingEventType) ? (value as TrackingEventType) : null;
};

const normalizeDeviceId = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (normalized.length < 8 || normalized.length > 200) {
    return null;
  }

  return normalized;
};

const truncateString = (value: unknown, maxLength: number): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
};

const normalizeBrowserContext = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const screen = source.screen && typeof source.screen === "object" && !Array.isArray(source.screen)
    ? (source.screen as Record<string, unknown>)
    : {};

  return {
    colorDepth: typeof screen.colorDepth === "number" ? screen.colorDepth : undefined,
    devicePixelRatio: typeof source.devicePixelRatio === "number" ? source.devicePixelRatio : undefined,
    language: truncateString(source.language, 40),
    languages: Array.isArray(source.languages)
      ? source.languages
          .filter((language): language is string => typeof language === "string")
          .slice(0, 5)
          .map((language) => language.slice(0, 40))
      : undefined,
    platform: truncateString(source.platform, 80),
    screenHeight: typeof screen.height === "number" ? screen.height : undefined,
    screenWidth: typeof screen.width === "number" ? screen.width : undefined,
    timezone: truncateString(source.timezone, 80),
  };
};

const getBearerToken = (request: NextRequest): string | null => {
  const authorization = request.headers.get("authorization")?.trim();
  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorization.slice("bearer ".length).trim();
  return token || null;
};

const decodeJwtClaims = (token: string): JwtClaims => {
  const [, encodedPayload] = token.split(".");
  if (!encodedPayload) {
    return {};
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as JwtClaims;
  } catch {
    return {};
  }
};

const hashValue = (value: string): string => createHash("sha256").update(value).digest("hex");

const getAuthSessionId = (token: string): string => {
  const claims = decodeJwtClaims(token);
  const claimSessionId = typeof claims.session_id === "string" ? claims.session_id : claims.sid;

  if (typeof claimSessionId === "string" && claimSessionId.trim()) {
    return claimSessionId.trim().slice(0, 200);
  }

  return `token:${hashValue(token).slice(0, 64)}`;
};

const getRequestIp = (
  request: NextRequest
): {
  address: string | null;
  source: string | null;
} => {
  const candidates: Array<{ source: string; value: string | null }> = [
    { source: "cf-connecting-ip", value: request.headers.get("cf-connecting-ip") },
    { source: "x-forwarded-for", value: request.headers.get("x-forwarded-for")?.split(",")[0] ?? null },
    { source: "x-real-ip", value: request.headers.get("x-real-ip") },
  ];

  for (const candidate of candidates) {
    const value = candidate.value?.trim();
    if (!value) {
      continue;
    }

    const withoutBrackets = value.startsWith("[") && value.includes("]") ? value.slice(1, value.indexOf("]")) : value;
    const withoutPort =
      withoutBrackets.includes(".") && withoutBrackets.includes(":")
        ? withoutBrackets.replace(/:\d+$/u, "")
        : withoutBrackets;

    if (isIP(withoutPort)) {
      return {
        address: withoutPort,
        source: candidate.source,
      };
    }
  }

  return {
    address: null,
    source: null,
  };
};

const createFingerprintHash = ({
  deviceId,
  fingerprintSalt,
  userAgent,
  userId,
}: {
  deviceId: string;
  fingerprintSalt: string;
  userAgent: string | null;
  userId: string;
}): string =>
  createHmac("sha256", fingerprintSalt)
    .update(JSON.stringify([FINGERPRINT_VERSION, userId, deviceId, userAgent ?? ""]))
    .digest("hex");

const noStoreJson = (body: Record<string, unknown>, status: number) =>
  NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
    status,
  });

export async function POST(request: NextRequest) {
  const config = getTrackingConfig();
  if (!config) {
    return new NextResponse(null, {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 204,
    });
  }

  const token = getBearerToken(request);
  if (!token) {
    return noStoreJson({ error: "Missing bearer token." }, 401);
  }

  let payload: TrackingPayload;
  try {
    payload = (await request.json()) as TrackingPayload;
  } catch {
    return noStoreJson({ error: "Invalid tracking payload." }, 400);
  }

  const eventType = normalizeTrackingEventType(payload.eventType);
  const deviceId = normalizeDeviceId(payload.deviceId);
  if (!eventType || !deviceId) {
    return noStoreJson({ error: "Invalid tracking payload." }, 400);
  }

  const supabase = createAdminClient(config);
  const { data: userResult, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userResult.user) {
    return noStoreJson({ error: "Invalid bearer token." }, 401);
  }

  const now = new Date().toISOString();
  const userAgent = request.headers.get("user-agent")?.slice(0, 512) ?? null;
  const requestIp = getRequestIp(request);
  const authSessionId = getAuthSessionId(token);
  const fingerprintHash = createFingerprintHash({
    deviceId,
    fingerprintSalt: config.fingerprintSalt,
    userAgent,
    userId: userResult.user.id,
  });
  const signInEvent = eventType === "sign_in" || eventType === "sign_up";

  const { data: existingRow, error: existingError } = await supabase
    .from("user_session_activity")
    .select("id, sign_in_count")
    .eq("user_id", userResult.user.id)
    .eq("auth_session_id", authSessionId)
    .eq("fingerprint_hash", fingerprintHash)
    .maybeSingle();

  if (existingError) {
    return noStoreJson({ status: "tracking_unavailable" }, 202);
  }

  if (existingRow) {
    const { error: updateError } = await supabase
      .from("user_session_activity")
      .update({
        browser_context: normalizeBrowserContext(payload.browserContext),
        ip_source: requestIp.source,
        last_event_type: eventType,
        last_ip_address: requestIp.address,
        last_seen_at: now,
        login_ip_address: signInEvent ? requestIp.address : undefined,
        sign_in_count: signInEvent ? Number(existingRow.sign_in_count ?? 0) + 1 : existingRow.sign_in_count,
        signed_in_at: signInEvent ? now : undefined,
        signed_out_at: eventType === "sign_out" ? now : signInEvent ? null : undefined,
        user_agent: userAgent,
      })
      .eq("id", existingRow.id);

    if (updateError) {
      return noStoreJson({ status: "tracking_unavailable" }, 202);
    }

    return noStoreJson({ status: "tracked" }, 200);
  }

  const { error: insertError } = await supabase.from("user_session_activity").insert({
    auth_session_id: authSessionId,
    browser_context: normalizeBrowserContext(payload.browserContext),
    fingerprint_hash: fingerprintHash,
    fingerprint_version: FINGERPRINT_VERSION,
    ip_source: requestIp.source,
    last_event_type: eventType,
    last_ip_address: requestIp.address,
    last_seen_at: now,
    login_ip_address: requestIp.address,
    sign_in_count: signInEvent ? 1 : 0,
    signed_in_at: now,
    signed_out_at: eventType === "sign_out" ? now : null,
    user_agent: userAgent,
    user_id: userResult.user.id,
  });

  if (insertError) {
    return noStoreJson({ status: "tracking_unavailable" }, 202);
  }

  return noStoreJson({ status: "tracked" }, 201);
}
