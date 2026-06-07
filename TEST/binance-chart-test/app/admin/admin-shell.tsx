import Link from "next/link";
import type { ReactNode } from "react";

type AdminSection = "users" | "settings";

interface AdminShellProps {
  children: ReactNode;
  className?: string;
}

interface AdminPageHeroProps {
  description: string;
  eyebrow: string;
  meta: Array<{
    label: string;
    value: string;
  }>;
  title: string;
}

const ADMIN_NAV_ITEMS: Array<{
  description: string;
  href: string;
  id: AdminSection;
  label: string;
}> = [
  {
    description: "Accounts and saved-layout activity",
    href: "/admin/users",
    id: "users",
    label: "Users",
  },
  {
    description: "Credentials and access controls",
    href: "/admin/settings",
    id: "settings",
    label: "Settings",
  },
];

export function AdminShell({ children, className }: AdminShellProps) {
  return <main className={className ? `admin-shell ${className}` : "admin-shell"}>{children}</main>;
}

export function AdminTopbar({ active }: { active: AdminSection }) {
  return (
    <header className="admin-topbar">
      <Link className="admin-brand" href="/admin/users">
        <span className="admin-brand-mark">PC</span>
        <span>
          <strong>ProCharting Admin</strong>
          <small>Operations console</small>
        </span>
      </Link>

      <nav className="admin-nav" aria-label="Admin sections">
        {ADMIN_NAV_ITEMS.map((item) => (
          <Link
            aria-current={active === item.id ? "page" : undefined}
            className="admin-nav-link"
            href={item.href}
            key={item.id}
          >
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </Link>
        ))}
      </nav>

      <div className="admin-topbar-actions">
        <Link className="admin-ghost-link" href="/">
          Market desk
        </Link>
        <form action="/admin/logout" method="post">
          <button className="admin-ghost-button" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}

export function AdminPageHero({ description, eyebrow, meta, title }: AdminPageHeroProps) {
  return (
    <header className="admin-page-hero">
      <div className="admin-page-copy">
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <dl className="admin-route-card" aria-label={`${title} details`}>
        {meta.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
