"use client";
import { Link, useSearchParams } from "@/lib/next-router";
import SiteFooter from "./Sitefooter";
import "./SignupSuccess.css";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

export default function SignupSuccess() {
  const [params] = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <div className="signup-success-page">
      <main className="signup-success-card">
        <img className="signup-success-logo" src="/assets/dyo%20logo.png" alt="DYO" />
        <div className="signup-success-icon" aria-hidden="true">
          <svg className="signup-success-check" viewBox="0 0 64 64" fill="none">
            <circle className="signup-success-ring" cx="32" cy="32" r="28" />
            <path className="signup-success-tick" d="m19 33 9 9 18-20" />
          </svg>
          <span className="signup-success-spark signup-success-spark--one">✦</span>
          <span className="signup-success-spark signup-success-spark--two">✧</span>
        </div>
        <p className="signup-success-eyebrow">Welcome to the DYO community</p>
        <h1>You’re all signed up!</h1>
        <p className="signup-success-copy">
          Your account has been created successfully. Sign in to continue to your DYO space.
        </p>
        <Link className="signup-success-button" to={loginHref}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3m9-8h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7" /></svg>
          Proceed to sign in
          <span aria-hidden="true">→</span>
        </Link>
        <p className="signup-success-footnote">Your account is ready whenever you are.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
