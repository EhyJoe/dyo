"use client";
import { Link } from "@/lib/next-router";
import SiteFooter from "./Sitefooter";
import "./Auth.css";

export default function CheckYourEmail() {
  return (
    <div className="auth-page">
      <div className="auth-card auth-card--narrow">
        <img src="/assets/dyo%20logo.png" alt="Diocesan Youth Organization" className="auth-logo" />
        <h1>Your account is ready</h1>
        <p className="auth-sub">You can sign in with the email and password you used to register.</p>
        <Link className="home-btn" to="/login">Continue to sign in</Link>
      </div>
      <SiteFooter />
    </div>
  );
}
