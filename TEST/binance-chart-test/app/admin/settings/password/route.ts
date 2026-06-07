import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminCookieValue } from "../../../../lib/admin-access";
import {
  getActiveAdminCredentials,
  getAdminSessionConfigFromCredentials,
  validateNewAdminPassword,
  verifyAdminPassword,
  writeAdminPassword,
} from "../../../../lib/admin-credentials";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionValue,
  getRequestOrigin,
} from "../../../../lib/admin-session";

export const runtime = "nodejs";

const createSettingsRedirect = (request: NextRequest, params: Record<string, string>) => {
  const redirectUrl = new URL("/admin/settings", getRequestOrigin(request.headers, request.url));
  for (const [key, value] of Object.entries(params)) {
    redirectUrl.searchParams.set(key, value);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
};

export async function POST(request: NextRequest) {
  const hasAdminSession = await verifyAdminCookieValue(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (!hasAdminSession) {
    return NextResponse.redirect(new URL("/admin?next=%2Fadmin%2Fsettings", getRequestOrigin(request.headers, request.url)), {
      status: 303,
    });
  }

  const adminCredentials = await getActiveAdminCredentials();
  if (!adminCredentials) {
    return createSettingsRedirect(request, { error: "config" });
  }

  const formData = await request.formData();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!(await verifyAdminPassword(currentPassword, adminCredentials))) {
    return createSettingsRedirect(request, { error: "current" });
  }

  if (newPassword !== confirmPassword) {
    return createSettingsRedirect(request, { error: "mismatch" });
  }

  const validationError = validateNewAdminPassword(newPassword);
  if (validationError) {
    return createSettingsRedirect(request, { error: validationError });
  }

  try {
    const updatedCredentials = await writeAdminPassword(newPassword);
    const sessionValue = await createAdminSessionValue(getAdminSessionConfigFromCredentials(updatedCredentials));
    const response = createSettingsRedirect(request, { updated: "1" });
    response.cookies.set(ADMIN_SESSION_COOKIE, sessionValue, {
      httpOnly: true,
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      path: "/admin",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch {
    return createSettingsRedirect(request, { error: "write" });
  }
}
