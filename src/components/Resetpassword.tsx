"use client";
import { Link } from "@/lib/next-router";
import SiteFooter from "./Sitefooter";
import "./Auth.css";

export default function ResetPassword() {
  return (
    <div className="auth-page">
      <div className="auth-card auth-card--narrow">
        <img src="/assets/dyo%20logo.png" alt="Diocesan Youth Organization" className="auth-logo" />
        <h1>Password reset</h1>
        <p className="auth-sub">Password reset emails are not configured yet. Contact the youth office for help accessing your account.</p>
        <Link to="/login">Back to sign in</Link>
      </div>
      <SiteFooter />
    </div>
  );
}
