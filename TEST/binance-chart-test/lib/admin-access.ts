import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  sanitizeAdminNextPath,
  verifyAdminSessionValue,
} from "./admin-session";
import {
  getActiveAdminCredentials,
  getAdminSessionConfigFromCredentials,
} from "./admin-credentials";

export const verifyAdminCookieValue = async (value: string | undefined): Promise<boolean> => {
  const credentials = await getActiveAdminCredentials();
  if (!credentials) {
    return false;
  }

  return verifyAdminSessionValue(value, getAdminSessionConfigFromCredentials(credentials));
};

export const requireAdminPageSession = async (nextPath: string): Promise<void> => {
  const cookieStore = await cookies();
  const hasAdminSession = await verifyAdminCookieValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!hasAdminSession) {
    redirect(`/admin?next=${encodeURIComponent(sanitizeAdminNextPath(nextPath))}`);
  }
};
