"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "@/lib/next-router";
import Navbar from "./Navbar";
import SiteFooter from "./Sitefooter";
import "./Auth.css";

export default function Passwordresetverify() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get("email") ?? "";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/password-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "We couldn't verify that code.");
      navigate(`/forgot-password/new?token=${encodeURIComponent(result.reset_token)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't verify that code.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!email) return setError("Go back and enter your account email first.");
    setResending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "We couldn't resend the code. Try again.");
      setResendSeconds(Number(result.resend_after_seconds) || 60);
      setNotice("If an account matches this email, a new code has been sent. Check your inbox and spam folder.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't resend the code. Try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="auth-page">
        <form className="auth-card auth-card--narrow" onSubmit={verify}>
          <img src="/assets/dyo%20logo.png" alt="Diocesan Youth Organization" className="auth-logo" />
          <h1>Enter your reset code</h1>
          <p className="auth-sub">Enter the six-digit code sent to <strong>{email || "your email"}</strong>. It expires after 10 minutes.</p>
          <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}"
            maxLength={6} placeholder="Six-digit code" value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            required disabled={busy} />
          {error && <p className="auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-success" role="status">{notice}</p>}
          <button type="submit" disabled={busy || code.length !== 6}>{busy ? "Checking code…" : "Verify code"}</button>
          <button type="button" className="linkish" onClick={resend} disabled={resending || resendSeconds > 0}>
            {resending ? "Sending…" : resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
          </button>
          <p className="auth-alt"><Link to="/forgot-password">Use a different email</Link></p>
        </form>
        <SiteFooter />
      </div>
    </>
  );
}
