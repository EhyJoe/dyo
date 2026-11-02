"use client";
import { Link } from "@/lib/next-router";
import Navbar from "./Navbar";
import SiteFooter from "./Sitefooter";
import "./Auth.css";

export default function PasswordResetSuccess() {
  return (
    <>
      <Navbar />
      <main className="auth-page">
        <section className="auth-card auth-card--narrow reset-success-card" aria-labelledby="reset-success-title">
          <div className="reset-success-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <path d="m13 24 7 7 15-16" />
            </svg>
          </div>
          <p className="auth-eyebrow reset-success-eyebrow">Password updated</p>
          <h1 id="reset-success-title">You’re all set!</h1>
          <p className="auth-sub">Your password has been changed successfully. Sign in with your new password to continue.</p>
          <Link className="reset-success-button" to="/login">Continue to sign in</Link>
        </section>
        <SiteFooter />
      </main>
    </>
  );
}
