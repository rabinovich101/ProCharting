import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPageSession } from "../../../lib/admin-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Settings | ProCharting",
  description: "ProCharting admin security settings",
};

type SearchParamValue = string | string[] | undefined;

interface AdminSettingsPageProps {
  searchParams?: Promise<Record<string, SearchParamValue>>;
}

const getSearchParam = (searchParams: Record<string, SearchParamValue>, key: string): string | undefined => {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
};

const getStatusMessage = (updated: string | undefined, error: string | undefined): string => {
  if (updated === "1") {
    return "Admin password updated.";
  }

  if (error === "current") {
    return "Current password is incorrect.";
  }

  if (error === "length") {
    return "New password must be at least 10 characters.";
  }

  if (error === "complexity") {
    return "Use letters, numbers, and a symbol in the new password.";
  }

  if (error === "mismatch") {
    return "New password confirmation does not match.";
  }

  if (error === "config") {
    return "Admin credentials are not configured on this deployment.";
  }

  if (error === "write") {
    return "Password update failed.";
  }

  return "";
};

export default async function AdminSettingsPage({ searchParams }: AdminSettingsPageProps) {
  await requireAdminPageSession("/admin/settings");

  const resolvedSearchParams = (await searchParams) ?? {};
  const statusMessage = getStatusMessage(
    getSearchParam(resolvedSearchParams, "updated"),
    getSearchParam(resolvedSearchParams, "error")
  );

  return (
    <main className="admin-users-shell">
      <header className="admin-users-hero">
        <div>
          <Link className="admin-back-link" href="/admin/users">
            Users
          </Link>
          <span className="admin-eyebrow">Admin settings</span>
          <h1>Settings</h1>
          <p>Security controls for admin access.</p>
        </div>
        <div className="admin-hero-meta" aria-label="Admin settings details">
          <span>/admin/settings</span>
          <strong>Password</strong>
          <form action="/admin/logout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </header>

      <section className="admin-users-panel admin-settings-panel" aria-labelledby="admin-change-password-title">
        <div className="admin-users-panel-header">
          <div>
            <span className="admin-eyebrow">Security</span>
            <h2 id="admin-change-password-title">Change password</h2>
          </div>
        </div>

        <form className="admin-settings-form" action="/admin/settings/password" method="post">
          <label>
            <span>Current password</span>
            <input autoComplete="current-password" name="currentPassword" required type="password" />
          </label>
          <label>
            <span>New password</span>
            <input autoComplete="new-password" minLength={10} name="newPassword" required type="password" />
          </label>
          <label>
            <span>Confirm new password</span>
            <input autoComplete="new-password" minLength={10} name="confirmPassword" required type="password" />
          </label>
          {statusMessage && <span className="admin-login-status">{statusMessage}</span>}
          <button type="submit">Update password</button>
        </form>
      </section>
    </main>
  );
}
