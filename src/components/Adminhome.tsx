"use client";
import { Link } from "@/lib/next-router";
import { useAuth } from "./Authcontext";

const EDITORS = [
  { section: "programmes", to: "/private/programmes?type=dyo", title: "DYO programmes", detail: "Diocesan events, registration details and public programme pages." },
  { section: "programmes", to: "/private/programmes?type=archdeaconry", title: "Archdeaconry programmes", detail: "Create local events for a selected archdeaconry and manage registrations." },
  { section: "programmes", to: "/private/village-missions", title: "Village missions", detail: "Review volunteer registrations and track follow-up." },
  { section: "store", to: "/private/products", title: "Store items", detail: "Products and prices shown in the online store." },
  { section: "vouchers", to: "/private/vouchers", title: "Programme pass vouchers", detail: "Generate one-use codes for registrants to unlock programme pass cards." },
  { section: "gallery", to: "/private/gallery", title: "Gallery", detail: "Photos shown in the public gallery." },
  { section: "blog", to: "/private/blog", title: "Blog", detail: "Articles and reflections on the website." },
  { section: "leadership", to: "/private/leadership", title: "Leadership", detail: "People and roles displayed on the site." },
  { section: "tournaments", to: "/private/tournaments", title: "Tournaments", detail: "Tournament pages, fixtures and scores." },
];

export default function AdminHome() {
  const { profile, canAccess } = useAuth();
  const editors = EDITORS.filter(({ section }) => canAccess(section));
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <>
      <section className="admin-welcome">
        <div>
          <p className="admin-welcome-eyebrow">DIOCESE OF IBADAN NORTH · YOUTH OFFICE</p>
          <h1>{firstName ? `Welcome, ${firstName}` : "Manage the website"}</h1>
          <p>Your website, in good hands. Pick a section to make an update.</p>
        </div>
        <Link to="/" className="admin-welcome-link">Visit live site <span aria-hidden="true">↗</span></Link>
        <span className="admin-welcome-orbit" aria-hidden="true" />
      </section>

      <div className="admin-content-heading">
        <div><h2>Your content</h2><p>Every change here flows through to the public website.</p></div>
        <span>{editors.length} {editors.length === 1 ? "section" : "sections"}</span>
      </div>

      {profile?.role === "archdeaconry_admin" && (
        <Link to="/private/my-archdeaconry" className="a-card" style={{ display: "block", color: "inherit", textDecoration: "none", marginBottom: 18 }}>
          <strong>My archdeaconry</strong>
          <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>Update your archdeaconry page, photos and local programmes.</p>
        </Link>
      )}

      {editors.length === 0 ? (
        <div className="a-empty"><h3>No website sections assigned</h3><p>Ask a super admin to grant access to the content you manage.</p></div>
      ) : (
        <div className="admin-editor-grid">
          {editors.map((editor, index) => (
            <Link key={editor.to} to={editor.to} className="admin-editor-card">
              <span className={`admin-editor-symbol admin-editor-symbol--${editor.section}`} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className="admin-editor-copy">
                <strong>{editor.title}</strong>
                <small>{editor.detail}</small>
              </span>
              <span className="admin-editor-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
