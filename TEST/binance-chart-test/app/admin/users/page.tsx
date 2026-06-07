import type { Metadata } from "next";
import Link from "next/link";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Users | ProCharting",
  description: "Server-side ProCharting account administration",
};

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 50;
const MAX_PER_PAGE = 100;

type SearchParamValue = string | string[] | undefined;
type AdminSearchParams = Record<string, SearchParamValue>;

interface AdminUsersPageProps {
  searchParams?: Promise<AdminSearchParams>;
}

interface AdminConfig {
  basicAuthConfigured: boolean;
  missingKeys: string[];
  serviceRoleKey: string | null;
  supabaseUrl: string | null;
}

interface ResolvedAdminConfig {
  serviceRoleKey: string;
  supabaseUrl: string;
}

interface UserProfileRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ChartLayoutRow {
  user_id: string;
  name: string;
  is_autosave: boolean;
  created_at: string;
  updated_at: string;
}

interface LayoutSummary {
  autosaveCount: number;
  latestLayoutName: string | null;
  latestUpdatedAt: string | null;
  totalCount: number;
}

interface AdminUserRow {
  layoutSummary: LayoutSummary;
  profile: UserProfileRow | null;
  providers: string[];
  status: AccountStatus;
  user: User;
}

interface AccountStatus {
  label: string;
  tone: "good" | "warning" | "danger" | "neutral";
}

interface AdminUsersResult {
  fetchErrors: string[];
  lastPage: number;
  nextPage: number | null;
  page: number;
  perPage: number;
  rows: AdminUserRow[];
  total: number;
}

const getFirstEnv = (...names: string[]): string | null => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
};

const getAdminConfig = (): AdminConfig => {
  const supabaseUrl = getFirstEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getFirstEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "SERVICE_ROLE_KEY");
  const basicAuthConfigured = Boolean(
    process.env.PROCHARTS_ADMIN_USERNAME?.trim() && process.env.PROCHARTS_ADMIN_PASSWORD?.trim()
  );
  const missingKeys: string[] = [];

  if (!basicAuthConfigured) {
    missingKeys.push("PROCHARTS_ADMIN_USERNAME and PROCHARTS_ADMIN_PASSWORD");
  }

  if (!supabaseUrl) {
    missingKeys.push("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    missingKeys.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  return {
    basicAuthConfigured,
    missingKeys,
    serviceRoleKey,
    supabaseUrl,
  };
};

const getSearchParam = (searchParams: AdminSearchParams, key: string): string | undefined => {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
};

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const createAdminClient = (config: ResolvedAdminConfig) =>
  createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        "X-Client-Info": "procharting-admin-users",
      },
    },
  });

const loadProfiles = async (
  supabase: SupabaseClient,
  userIds: string[]
): Promise<{ error: string | null; profiles: UserProfileRow[] }> => {
  if (userIds.length === 0) {
    return { error: null, profiles: [] };
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, avatar_url, created_at, updated_at")
    .in("user_id", userIds);

  return {
    error: error?.message ?? null,
    profiles: (data ?? []) as UserProfileRow[],
  };
};

const loadLayoutRows = async (
  supabase: SupabaseClient,
  userIds: string[]
): Promise<{ error: string | null; layouts: ChartLayoutRow[] }> => {
  if (userIds.length === 0) {
    return { error: null, layouts: [] };
  }

  const { data, error } = await supabase
    .from("chart_layouts")
    .select("user_id, name, is_autosave, created_at, updated_at")
    .in("user_id", userIds);

  return {
    error: error?.message ?? null,
    layouts: (data ?? []) as ChartLayoutRow[],
  };
};

const createEmptyLayoutSummary = (): LayoutSummary => ({
  autosaveCount: 0,
  latestLayoutName: null,
  latestUpdatedAt: null,
  totalCount: 0,
});

const summarizeLayouts = (layouts: ChartLayoutRow[]): Map<string, LayoutSummary> => {
  const summaries = new Map<string, LayoutSummary>();

  for (const layout of layouts) {
    const current = summaries.get(layout.user_id) ?? createEmptyLayoutSummary();
    current.totalCount += 1;
    if (layout.is_autosave) {
      current.autosaveCount += 1;
    }

    const latestTimestamp = current.latestUpdatedAt ? Date.parse(current.latestUpdatedAt) : -Infinity;
    if (Date.parse(layout.updated_at) > latestTimestamp) {
      current.latestLayoutName = layout.name;
      current.latestUpdatedAt = layout.updated_at;
    }

    summaries.set(layout.user_id, current);
  }

  return summaries;
};

const getAccountStatus = (user: User): AccountStatus => {
  if (user.deleted_at) {
    return { label: "Deleted", tone: "danger" };
  }

  if (user.banned_until && Date.parse(user.banned_until) > Date.now()) {
    return { label: "Banned", tone: "danger" };
  }

  const confirmed = Boolean(user.confirmed_at ?? user.email_confirmed_at ?? user.phone_confirmed_at);
  if (!confirmed) {
    return { label: "Pending confirmation", tone: "warning" };
  }

  if (user.last_sign_in_at) {
    return { label: "Active", tone: "good" };
  }

  return { label: "Confirmed", tone: "neutral" };
};

const getProviders = (user: User): string[] => {
  const providers = new Set<string>();

  if (user.app_metadata.provider) {
    providers.add(user.app_metadata.provider);
  }

  for (const provider of user.app_metadata.providers ?? []) {
    providers.add(provider);
  }

  for (const identity of user.identities ?? []) {
    if (identity.provider) {
      providers.add(identity.provider);
    }
  }

  return Array.from(providers).sort((a, b) => a.localeCompare(b));
};

const loadAdminUsers = async (
  config: ResolvedAdminConfig,
  searchParams: AdminSearchParams
): Promise<AdminUsersResult> => {
  const page = parsePositiveInteger(getSearchParam(searchParams, "page"), DEFAULT_PAGE);
  const perPage = clamp(parsePositiveInteger(getSearchParam(searchParams, "perPage"), DEFAULT_PER_PAGE), 1, MAX_PER_PAGE);
  const supabase = createAdminClient(config);
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

  if (error) {
    throw new Error(error.message);
  }

  const users = data.users;
  const userIds = users.map((user) => user.id);
  const [profileResult, layoutResult] = await Promise.all([
    loadProfiles(supabase, userIds),
    loadLayoutRows(supabase, userIds),
  ]);
  const profilesByUserId = new Map(profileResult.profiles.map((profile) => [profile.user_id, profile]));
  const layoutSummariesByUserId = summarizeLayouts(layoutResult.layouts);

  return {
    fetchErrors: [profileResult.error, layoutResult.error].filter((message): message is string => Boolean(message)),
    lastPage: data.lastPage ?? page,
    nextPage: data.nextPage ?? null,
    page,
    perPage,
    rows: users.map((user) => ({
      layoutSummary: layoutSummariesByUserId.get(user.id) ?? createEmptyLayoutSummary(),
      profile: profilesByUserId.get(user.id) ?? null,
      providers: getProviders(user),
      status: getAccountStatus(user),
      user,
    })),
    total: data.total ?? users.length,
  };
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
};

const formatBoolean = (value: boolean | undefined): string => (value ? "Yes" : "No");

const formatJson = (value: unknown): string => JSON.stringify(value ?? {}, null, 2);

const createPageHref = (page: number, perPage: number): string => `/admin/users?page=${page}&perPage=${perPage}`;

const renderTime = (value: string | null | undefined) => (
  <time dateTime={value ?? undefined} title={value ?? undefined}>
    {formatDate(value)}
  </time>
);

const renderMissingConfig = (config: AdminConfig) => (
  <section className="admin-config-panel" aria-labelledby="admin-config-title">
    <span className="admin-eyebrow">Configuration needed</span>
    <h2 id="admin-config-title">Admin users panel is disabled</h2>
    <p>
      Add the missing server-only environment variables before deploying this route with live account data.
    </p>
    <ul>
      {config.missingKeys.map((key) => (
        <li key={key}>
          <code>{key}</code>
        </li>
      ))}
    </ul>
  </section>
);

const renderLoadError = (error: Error) => (
  <section className="admin-config-panel danger" role="alert">
    <span className="admin-eyebrow">Supabase error</span>
    <h2>User data could not be loaded</h2>
    <p>{error.message}</p>
  </section>
);

const renderPagination = (result: AdminUsersResult) => (
  <nav className="admin-pagination" aria-label="User pages">
    <Link
      aria-disabled={result.page <= 1}
      className={result.page <= 1 ? "disabled" : undefined}
      href={createPageHref(Math.max(1, result.page - 1), result.perPage)}
    >
      Previous
    </Link>
    <span>
      Page {result.page} of {result.lastPage || 1}
    </span>
    <Link
      aria-disabled={!result.nextPage}
      className={!result.nextPage ? "disabled" : undefined}
      href={createPageHref(result.nextPage ?? result.page, result.perPage)}
    >
      Next
    </Link>
  </nav>
);

const AdminStats = ({ result }: { result: AdminUsersResult }) => {
  const activeUsers = result.rows.filter((row) => row.status.label === "Active").length;
  const pendingUsers = result.rows.filter((row) => row.status.label === "Pending confirmation").length;
  const layoutCount = result.rows.reduce((total, row) => total + row.layoutSummary.totalCount, 0);
  const oauthUsers = result.rows.filter((row) => row.providers.length > 0).length;

  return (
    <section className="admin-stat-grid" aria-label="Current user page summary">
      <div>
        <span>Total users</span>
        <strong>{result.total}</strong>
      </div>
      <div>
        <span>Active on page</span>
        <strong>{activeUsers}</strong>
      </div>
      <div>
        <span>Pending on page</span>
        <strong>{pendingUsers}</strong>
      </div>
      <div>
        <span>OAuth users on page</span>
        <strong>{oauthUsers}</strong>
      </div>
      <div>
        <span>Layouts on page</span>
        <strong>{layoutCount}</strong>
      </div>
    </section>
  );
};

const AdminUsersTable = ({ result }: { result: AdminUsersResult }) => (
  <section className="admin-users-panel" aria-labelledby="admin-users-table-title">
    <div className="admin-users-panel-header">
      <div>
        <span className="admin-eyebrow">Accounts</span>
        <h2 id="admin-users-table-title">Supabase users</h2>
      </div>
      {renderPagination(result)}
    </div>

    {result.fetchErrors.length > 0 && (
      <div className="admin-inline-warning" role="status">
        {result.fetchErrors.map((message) => (
          <span key={message}>{message}</span>
        ))}
      </div>
    )}

    <div className="admin-users-table-wrap">
      <table className="admin-users-table">
        <thead>
          <tr>
            <th scope="col">User</th>
            <th scope="col">Status</th>
            <th scope="col">Identity</th>
            <th scope="col">Profile</th>
            <th scope="col">Layouts</th>
            <th scope="col">Timeline</th>
            <th scope="col">Details</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr key={row.user.id}>
              <td>
                <span className="admin-primary-text">{row.user.email ?? row.user.phone ?? "No contact"}</span>
                <code>{row.user.id}</code>
              </td>
              <td>
                <span className={`admin-status-pill ${row.status.tone}`}>{row.status.label}</span>
                <small>Anonymous: {formatBoolean(row.user.is_anonymous)}</small>
                <small>SSO: {formatBoolean(row.user.is_sso_user)}</small>
              </td>
              <td>
                <span>{row.providers.length > 0 ? row.providers.join(", ") : "Email/password"}</span>
                <small>Role: {row.user.role ?? "authenticated"}</small>
                <small>Audience: {row.user.aud}</small>
              </td>
              <td>
                <span>{row.profile?.display_name ?? "No profile name"}</span>
                <small>Profile created: {formatDate(row.profile?.created_at)}</small>
                <small>Profile updated: {formatDate(row.profile?.updated_at)}</small>
              </td>
              <td>
                <span>{row.layoutSummary.totalCount} saved</span>
                <small>Autosaves: {row.layoutSummary.autosaveCount}</small>
                <small>Latest: {row.layoutSummary.latestLayoutName ?? "None"}</small>
              </td>
              <td>
                <span>Created: {renderTime(row.user.created_at)}</span>
                <small>Last sign in: {formatDate(row.user.last_sign_in_at)}</small>
                <small>Updated: {formatDate(row.user.updated_at)}</small>
              </td>
              <td>
                <details className="admin-user-details">
                  <summary>Open</summary>
                  <dl>
                    <div>
                      <dt>Email confirmed</dt>
                      <dd>{formatDate(row.user.email_confirmed_at)}</dd>
                    </div>
                    <div>
                      <dt>Phone confirmed</dt>
                      <dd>{formatDate(row.user.phone_confirmed_at)}</dd>
                    </div>
                    <div>
                      <dt>Confirmation sent</dt>
                      <dd>{formatDate(row.user.confirmation_sent_at)}</dd>
                    </div>
                    <div>
                      <dt>Recovery sent</dt>
                      <dd>{formatDate(row.user.recovery_sent_at)}</dd>
                    </div>
                    <div>
                      <dt>New email</dt>
                      <dd>{row.user.new_email ?? "None"}</dd>
                    </div>
                    <div>
                      <dt>Banned until</dt>
                      <dd>{formatDate(row.user.banned_until)}</dd>
                    </div>
                    <div>
                      <dt>Latest layout update</dt>
                      <dd>{formatDate(row.layoutSummary.latestUpdatedAt)}</dd>
                    </div>
                  </dl>
                  <pre>{formatJson({
                    app_metadata: row.user.app_metadata,
                    identities: row.user.identities ?? [],
                    profile: row.profile,
                    user_metadata: row.user.user_metadata,
                  })}</pre>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {result.rows.length === 0 && (
      <div className="admin-empty-state" role="status">
        <strong>No users found</strong>
        <span>This Supabase project did not return users for the current page.</span>
      </div>
    )}
  </section>
);

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const config = getAdminConfig();
  const ready = Boolean(config.basicAuthConfigured && config.serviceRoleKey && config.supabaseUrl);
  let result: AdminUsersResult | null = null;
  let loadError: Error | null = null;

  if (ready) {
    try {
      result = await loadAdminUsers(
        {
          serviceRoleKey: config.serviceRoleKey!,
          supabaseUrl: config.supabaseUrl!,
        },
        resolvedSearchParams
      );
    } catch (error) {
      loadError = error instanceof Error ? error : new Error("Unknown admin loading error.");
    }
  }

  return (
    <main className="admin-users-shell">
      <header className="admin-users-hero">
        <div>
          <Link className="admin-back-link" href="/">
            Market desk
          </Link>
          <span className="admin-eyebrow">Server admin</span>
          <h1>User administration</h1>
          <p>Supabase Auth accounts, profile records, and saved chart layout activity.</p>
        </div>
        <div className="admin-hero-meta" aria-label="Admin route details">
          <span>/admin/users</span>
          <strong>Service-role only</strong>
        </div>
      </header>

      {!ready && renderMissingConfig(config)}
      {loadError && renderLoadError(loadError)}
      {result && (
        <>
          <AdminStats result={result} />
          <AdminUsersTable result={result} />
        </>
      )}
    </main>
  );
}
