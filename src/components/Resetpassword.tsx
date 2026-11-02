"use client";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "@/lib/next-router";
import Navbar from "./Navbar";
import SiteFooter from "./Sitefooter";
import "./Auth.css";

export default function Resetpassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "We couldn't send a reset code. Try again.");
      navigate(`/forgot-password/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't send a reset code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="auth-page">
        <form className="auth-card auth-card--narrow" onSubmit={submit}>
          <img src="/assets/dyo%20logo.png" alt="Diocesan Youth Organization" className="auth-logo" />
          <h1>Forgot password?</h1>
          <p className="auth-sub">Enter the email on your account and we’ll send you a six-digit reset code.</p>
          <input type="email" placeholder="Email" value={email} autoComplete="email"
            onChange={(event) => setEmail(event.target.value)} required disabled={busy} />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? "Sending code…" : "Send reset code"}</button>
          <p className="auth-alt"><Link to="/login">Back to sign in</Link></p>
        </form>
        <SiteFooter />
      </div>
    </>
  );
}
