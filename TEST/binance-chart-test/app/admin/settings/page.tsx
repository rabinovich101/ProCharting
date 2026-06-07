import type { Metadata } from "next";
import { requireAdminPageSession } from "../../../lib/admin-access";
import { AdminPageHero, AdminShell, AdminTopbar } from "../admin-shell";

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
    <AdminShell>
      <AdminTopbar active="settings" />
      <AdminPageHero
        description="Security controls for rotating the active admin credential source without exposing private runtime state."
        eyebrow="Admin settings"
        meta={[
          { label: "Route", value: "/admin/settings" },
          { label: "Control", value: "Password rotation" },
          { label: "Session", value: "Refreshes on update" },
        ]}
        title="Settings"
      />

      <div className="admin-settings-grid">
        <aside className="admin-side-panel" aria-label="Admin security model">
          <span className="admin-eyebrow">Access model</span>
          <h2>Credential changes stay server-side.</h2>
          <p>
            The active admin password can move from bootstrap environment variables to the private credentials file
            without exposing secret material to the browser.
          </p>
          <dl>
            <div>
              <dt>Cookie</dt>
              <dd>Signed and HTTP-only</dd>
            </div>
            <div>
              <dt>Scope</dt>
              <dd>Restricted to admin routes</dd>
            </div>
            <div>
              <dt>Policy</dt>
              <dd>Minimum 10 characters with complexity</dd>
            </div>
          </dl>
        </aside>

        <section className="admin-panel admin-settings-panel" aria-labelledby="admin-change-password-title">
          <div className="admin-panel-header">
            <div>
              <span className="admin-eyebrow">Security</span>
              <h2 id="admin-change-password-title">Change password</h2>
              <p>Update the admin credential used by future login attempts.</p>
            </div>
          </div>

          <form className="admin-form-card admin-settings-form" action="/admin/settings/password" method="post">
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
      </div>
    </AdminShell>
  );
}
