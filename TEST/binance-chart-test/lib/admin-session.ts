export const ADMIN_SESSION_COOKIE = "procharting_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface AdminSessionPayload {
  exp: number;
  sub: string;
  v: 1;
}

export interface AdminSessionConfig {
  sessionSecret: string;
  username: string;
}

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
};

const stringToBase64Url = (value: string): string => bytesToBase64Url(encoder.encode(value));

const base64UrlToString = (value: string): string => {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return decoder.decode(bytes);
};

const createHmacSignature = async (payload: string, secret: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return bytesToBase64Url(new Uint8Array(signature));
};

const constantTimeEqual = (left: string, right: string): boolean => {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const leftCode = index < left.length ? left.charCodeAt(index) : 0;
    const rightCode = index < right.length ? right.charCodeAt(index) : 0;
    difference |= leftCode ^ rightCode;
  }

  return difference === 0;
};

export const createAdminSessionValue = async (config: AdminSessionConfig, now = Date.now()): Promise<string> => {
  const payload: AdminSessionPayload = {
    exp: Math.floor(now / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
    sub: config.username,
    v: 1,
  };
  const encodedPayload = stringToBase64Url(JSON.stringify(payload));
  const signature = await createHmacSignature(encodedPayload, config.sessionSecret);

  return `${encodedPayload}.${signature}`;
};

export const verifyAdminSessionValue = async (
  value: string | undefined,
  config: AdminSessionConfig | null,
  now = Date.now()
): Promise<boolean> => {
  if (!value || !config) {
    return false;
  }

  const [encodedPayload, signature, extra] = value.split(".");
  if (!encodedPayload || !signature || extra !== undefined) {
    return false;
  }

  const expectedSignature = await createHmacSignature(encodedPayload, config.sessionSecret);
  if (!constantTimeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlToString(encodedPayload)) as Partial<AdminSessionPayload>;
    return payload.v === 1 && payload.sub === config.username && typeof payload.exp === "number" && payload.exp > now / 1000;
  } catch {
    return false;
  }
};

export const sanitizeAdminNextPath = (value: FormDataEntryValue | string | null | undefined): string => {
  const nextPath = typeof value === "string" ? value : "";

  if (
    !nextPath.startsWith("/admin") ||
    nextPath.startsWith("//") ||
    nextPath.startsWith("/admin/login") ||
    nextPath.startsWith("/admin/logout")
  ) {
    return "/admin/users";
  }

  return nextPath;
};

export const getRequestOrigin = (headers: Headers, fallbackUrl: string | URL): string => {
  const fallback = new URL(fallbackUrl);
  const host = headers.get("host") ?? fallback.host;
  const protocol = headers.get("x-forwarded-proto") ?? fallback.protocol.replace(/:$/u, "");

  return `${protocol}://${host}`;
};
