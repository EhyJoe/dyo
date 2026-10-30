"use client";
import { Link } from "@/lib/next-router";
import { useAuth } from "./Authcontext";
import Navbar from "./Navbar";
import SiteFooter from "./Sitefooter";
import "./Memberdashboard.css";

const actions = [
  { href: "/programmes", icon: "01", title: "Explore programmes", copy: "Find gatherings, retreats and ways to serve." },
  { href: "/tournaments", icon: "02", title: "Join a tournament", copy: "See fixtures, results and upcoming competitions." },
  { href: "/store", icon: "03", title: "Visit the store", copy: "Browse DYO items and support the work." },
  { href: "/donate", icon: "04", title: "Give to the work", copy: "Help more young people take part." },
];

export default function Memberdashboard() {
  const { profile } = useAuth();
  const name = profile?.full_name?.trim() || "there";
  const completeFields = [profile?.full_name, profile?.email, profile?.phone, profile?.gender,
    profile?.date_of_birth, profile?.archdeaconry, profile?.church].filter(Boolean).length;
  const progress = Math.round((completeFields / 7) * 100);

  return (
    <div className="dashboard">
      <Navbar />
      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <div className="dashboard-welcome-copy">
            <p className="dashboard-eyebrow">Your DYO space</p>
            <h1>Welcome back, {name.split(/\s+/)[0]}.</h1>
            <p>Stay close to what is happening across the diocese. Your programmes, community and next steps are all here.</p>
            <Link className="dashboard-primary" to="/programmes">Explore programmes <span aria-hidden="true">&#8594;</span></Link>
          </div>
          <div className="dashboard-welcome-mark" aria-hidden="true">
            <img src="/assets/dyo%20logo.png" alt="" />
          </div>
        </section>

        <section className="dashboard-profile-card" aria-label="Profile completion">
          <div className="dashboard-avatar">
            {profile?.photo_url ? <img src={profile.photo_url} alt="" /> : <span>{name[0]?.toUpperCase() ?? "D"}</span>}
          </div>
          <div className="dashboard-profile-info">
            <p className="dashboard-eyebrow">Your profile</p>
            <h2>{profile?.full_name || "Complete your profile"}</h2>
            <p>{profile?.archdeaconry || "Add your archdeaconry"}{profile?.church ? ` / ${profile.church}` : ""}</p>
          </div>
          <div className="dashboard-progress-block">
            <div className="dashboard-progress-label"><span>Profile completeness</span><strong>{progress}%</strong></div>
            <div className="dashboard-progress-track"><span style={{ width: `${progress}%` }} /></div>
          </div>
          <Link to="/account" className="dashboard-secondary">Edit profile <span aria-hidden="true">&#8594;</span></Link>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div><p className="dashboard-eyebrow">Make yourself at home</p><h2>Your next step</h2></div>
            <Link to="/">Visit the homepage <span aria-hidden="true">&#8594;</span></Link>
          </div>
          <div className="dashboard-action-grid">
            {actions.map((action) => (
              <Link className="dashboard-action-card" to={action.href} key={action.href}>
                <span className="dashboard-action-icon" aria-hidden="true">{action.icon}</span>
                <span className="dashboard-action-title">{action.title}</span>
                <span className="dashboard-action-copy">{action.copy}</span>
                <span className="dashboard-action-arrow" aria-hidden="true">&#8599;</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="dashboard-community">
          <div><p className="dashboard-eyebrow">One family, many places</p><h2>Find your community.</h2>
            <p>Connect with young people across Ibadan North Diocese and discover what your archdeaconry is doing.</p></div>
          <Link to="/programmes">Find a programme <span aria-hidden="true">&#8594;</span></Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
