import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAdminCookieValue } from "../../lib/admin-access";
import { ADMIN_SESSION_COOKIE, sanitizeAdminNextPath } from "../../lib/admin-session";
import { AdminShell } from "./admin-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Login | ProCharting",
  description: "Secure ProCharting admin entry",
};

type SearchParamValue = string | string[] | undefined;

interface AdminLoginPageProps {
  searchParams?: Promise<Record<string, SearchParamValue>>;
}

const getSearchParam = (searchParams: Record<string, SearchParamValue>, key: string): string | undefined => {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
};

const getStatusMessage = (error: string | undefined, loggedOut: string | undefined): string => {
  if (loggedOut === "1") {
    return "Signed out of the admin panel.";
  }

  if (error === "config") {
    return "Admin credentials are not configured on this deployment.";
  }

  if (error === "credentials") {
    return "Username or password is incorrect.";
  }

  if (error === "rate") {
    return "Too many failed attempts. Wait before trying again.";
  }

  return "";
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const nextPath = sanitizeAdminNextPath(getSearchParam(resolvedSearchParams, "next"));
  const cookieStore = await cookies();
  const hasAdminSession = await verifyAdminCookieValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const statusMessage = getStatusMessage(
    getSearchParam(resolvedSearchParams, "error"),
    getSearchParam(resolvedSearchParams, "loggedOut")
  );

  if (hasAdminSession && getSearchParam(resolvedSearchParams, "loggedOut") !== "1") {
    redirect(nextPath);
  }

  return (
    <AdminShell className="admin-login-shell">
      <section className="admin-login-panel" aria-labelledby="admin-login-title">
        <div className="admin-login-copy">
          <Link className="admin-back-link" href="/">
            Market desk
          </Link>
          <span className="admin-eyebrow">Admin entry</span>
          <h1 id="admin-login-title">ProCharting admin</h1>
          <p>Restricted operations console for account data, saved chart layouts, and access review.</p>

          <dl className="admin-login-proof" aria-label="Admin access safeguards">
            <div>
              <dt>Session</dt>
              <dd>HTTP-only cookie</dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>Server validated</dd>
            </div>
            <div>
              <dt>Scope</dt>
              <dd>Admin routes only</dd>
            </div>
          </dl>
        </div>

        <form className="admin-form-card admin-login-form" action="/admin/login" method="post">
          <div className="admin-form-heading">
            <span className="admin-eyebrow">Secure sign in</span>
            <h2>Enter the console</h2>
          </div>
          <input name="next" type="hidden" value={nextPath} />
          <label>
            <span>Username</span>
            <input autoComplete="username" autoFocus name="username" required type="text" />
          </label>
          <label>
            <span>Password</span>
            <input autoComplete="current-password" name="password" required type="password" />
          </label>
          {statusMessage && <span className="admin-login-status">{statusMessage}</span>}
          <button type="submit">Enter admin</button>
        </form>
      </section>
    </AdminShell>
  );
}
