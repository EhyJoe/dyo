"use client";
import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "@/lib/next-router";
import { useAuth } from "./Authcontext";
const logo = "/assets/dyo%20logo.png";
import "./Admin.css";

/**
 * The admin shell.
 *
 * The sidebar is limited to editors that change public site content.
 */

const Icon = ({ d }: { d: string }) => (
  <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
       strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const ICONS = {
  overview: "M3 12h6v9H3zM15 3h6v18h-6zM9 8h6v13H9z",
  tournaments: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 8l1.5 3 3.3.3-2.5 2.2.8 3.2L12 15l-2.9 1.9.8-3.2-2.5-2.2 3.3-.3z",
  programmes: "M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  store: "M3 3h2l2.2 10.4a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.2L20.5 6H5.2M9.5 19.5h.01M16.5 19.5h.01",
  vouchers: "M20 12V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5h-7a2 2 0 0 1 0-4h7M16 12h.01",
  leadership: "M12 3a3.2 3.2 0 1 1 0 6.4A3.2 3.2 0 0 1 12 3zM5 21v-1.6A4.4 4.4 0 0 1 9.4 15h5.2a4.4 4.4 0 0 1 4.4 4.4V21",
  gallery: "M4 5h16v14H4zM4 15l4.5-4.5 4 4L16 11l4 4M8.5 9.2h.01",
  blog: "M5 3h9l5 5v13H5zM14 3v5h5M9 12h6M9 16h4",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut, canAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const currentTitle = location.pathname === "/private" ? "Overview"
    : location.pathname.startsWith("/private/my-archdeaconry") ? "My archdeaconry"
      : location.pathname.startsWith("/private/village-missions") ? "Village missions"
        : location.pathname.startsWith("/private/programmes") ? (new URLSearchParams(location.search).get("type") === "archdeaconry" ? "Archdeaconry programmes" : "DYO programmes")
          : location.pathname.startsWith("/private/products") ? "Store items"
            : location.pathname.startsWith("/private/vouchers") ? "Vouchers"
            : location.pathname.startsWith("/private/gallery") ? "Gallery"
                : location.pathname.startsWith("/private/blog") ? "Blog"
                  : location.pathname.startsWith("/private/leadership") ? "Leadership"
                    : location.pathname.startsWith("/private/tournaments") ? "Tournaments" : "Website editor";

  // Close the drawer whenever the route changes, or it stays open over
  // the page you just navigated to.
  useEffect(() => { setOpen(false); }, [location.pathname]);

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  const Item = ({ to, icon, label }: {
    to: string; icon: string; label: string;
  }) => (
    <NavLink to={to} end={to === "/private"}>
      <Icon d={icon} />
      <span className="admin-nav-label">{label}</span>
    </NavLink>
  );

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <button className="admin-menu-button" onClick={() => setOpen((o) => !o)}
                aria-label={open ? "Close menu" : "Open menu"} aria-controls="admin-navigation" aria-expanded={open}>
          <span aria-hidden="true">{open ? "\u2715" : "\u2630"}</span>
        </button>
        <a href="/private" className="admin-mobile-brand">DYO <span>Website studio</span></a>
        <span className="admin-mobile-page">{currentTitle}</span>
      </div>

      {open && <div className="admin-scrim" onClick={() => setOpen(false)} />}

      <aside id="admin-navigation" className={`admin-spine${open ? " is-open" : ""}`}>
        <div className="admin-spine-head">
          <a className="admin-brand-mark" href="/private" aria-label="DYO admin home"><img src={logo} alt="" /></a>
          <div>
            <p className="admin-spine-title">DYO website</p>
            <p className="admin-spine-sub">CONTENT STUDIO</p>
          </div>
        </div>

        <nav className="admin-nav">
          <p className="admin-nav-group">Workspace</p>
          <Item to="/private" icon={ICONS.overview} label="Overview" />
          <p className="admin-nav-group">Manage your site</p>
          {profile?.role === "archdeaconry_admin" &&
            <Item to="/private/my-archdeaconry" icon={ICONS.leadership} label="My archdeaconry" />}
          {canAccess("programmes") && <>
            <Item to="/private/programmes?type=dyo" icon={ICONS.programmes} label="DYO programmes" />
            <Item to="/private/programmes?type=archdeaconry" icon={ICONS.programmes} label="Archdeaconry programmes" />
            <Item to="/private/village-missions" icon={ICONS.programmes} label="Village mission volunteers" />
          </>}
          {canAccess("store") && <Item to="/private/products" icon={ICONS.store} label="Store items" />}
          {canAccess("vouchers") && <Item to="/private/vouchers" icon={ICONS.vouchers} label="Vouchers" />}
          {canAccess("gallery") && <Item to="/private/gallery" icon={ICONS.gallery} label="Gallery" />}
          {canAccess("blog") && <Item to="/private/blog" icon={ICONS.blog} label="Blog" />}
          {canAccess("leadership") && <Item to="/private/leadership" icon={ICONS.leadership} label="Leadership" />}
          {canAccess("tournaments") && <Item to="/private/tournaments" icon={ICONS.tournaments} label="Tournaments" />}
        </nav>

        <div className="admin-spine-foot">
          <div className="admin-profile-chip">
            <span className="admin-profile-avatar">{profile?.full_name?.trim().charAt(0).toUpperCase() || "D"}</span>
            <span className="admin-profile-name">{profile?.full_name ?? "Signed in"}<small>Administrator</small></span>
          </div>
          <div className="admin-foot-links">
            <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>View website ↗</a>
            <a href="#signout" onClick={(e) => { e.preventDefault(); void handleSignOut(); }}>Sign out</a>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-desktop-bar">
          <div><span className="admin-crumb">Website</span><span className="admin-crumb-sep">/</span><strong>{currentTitle}</strong></div>
          <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>Open live website <span aria-hidden="true">↗</span></a>
        </header>
        <div className="admin-body">
          {children}
        </div>
      </main>
    </div>
  );
}





