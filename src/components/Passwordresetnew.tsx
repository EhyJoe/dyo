"use client";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "@/lib/next-router";
import Navbar from "./Navbar";
import SiteFooter from "./Sitefooter";
import "./Auth.css";

export default function Passwordresetnew() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!token) return setError("This password reset link is missing or expired. Request a new code.");
    if (password.length < 8) return setError("Your new password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("The passwords don't match yet.");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password-reset/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset_token: token, password, confirm_password: confirmPassword }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "We couldn't update your password.");
      navigate("/forgot-password/success", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't update your password.");
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
          <h1>Choose a new password</h1>
          <p className="auth-sub">Choose a password with at least eight characters, then confirm it below.</p>
          <input type="password" placeholder="New password" autoComplete="new-password"
            minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} />
          <input type="password" placeholder="Confirm new password" autoComplete="new-password"
            value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={busy} />
          {confirmPassword && password !== confirmPassword && <p className="signup-password-mismatch" role="status">Passwords don't match yet.</p>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" disabled={busy || !password || password !== confirmPassword}>
            {busy ? "Updating password…" : "Update password"}
          </button>
          <p className="auth-alt"><Link to="/login">Back to sign in</Link></p>
        </form>
        <SiteFooter />
      </div>
    </>
  );
}
