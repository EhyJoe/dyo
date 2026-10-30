"use client";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "@/lib/next-router";
const logo = "/assets/dyo%20logo.png";
import { useAuth } from "./Authcontext";
import SiteFooter from "./Sitefooter";
import "./Auth.css";

/**
 * One sign-in for everyone. The role on the profile decides what they see,
 * which is why the old separate AdminLogin page is gone.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { session, loading, isAdmin, acceptLogin } = useAuth();

  /**
   * Two different cases:
   *  - `requestedNext` is set when a guard sent them here mid-task ("register
   *    for this programme"). That always wins — finish what they started.
   *  - Otherwise we choose the landing page by role: admins run the office
   *    from /admin, so dropping them on the public home page just adds a click.
   */
  const requestedNext = params.get("next") ?? null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Someone already signed in has no business on this page — this also covers
  // landing here from the confirmation email with a live session.
  useEffect(() => {
    if (loading || !session) return;
    if (requestedNext) navigate(requestedNext, { replace: true });
    else navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
  }, [loading, session, isAdmin, requestedNext, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!navigator.onLine) {
      return setError("You're offline. Reconnect and try again.");
    }

    setBusy(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const response = await Promise.race([
        fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
          signal: controller.signal,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 12_000)),
      ]);
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "That email and password don't match an account.");
        return;
      }
      acceptLogin(result.user, result.profile);

      if (requestedNext) {
        navigate(requestedNext, { replace: true });
        return;
      }
      const role = result.profile?.role;
      navigate(role === "admin" || role === "super_admin" || role === "archdeaconry_admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      setError(
        (err as Error)?.message === "timeout"
          ? "That's taking longer than it should. Check your connection and try again."
          : "We couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    setError("");
    if (!email.trim()) return setError("Enter your email above first, then tap this.");
    setError("Password reset is not available yet. Please contact the youth office.");
  };

  return (
    <div className="auth-page">
      <form className="auth-card auth-card--narrow" onSubmit={submit}>
        <img src={logo} alt="Diocesan Youth Organization" className="auth-logo" />
        <h1>Sign in</h1>

        <input type="email" placeholder="Email" value={email} autoComplete="email"
               onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
        <div className="password-field">
          <input type={showPassword ? "text" : "password"} placeholder="Password"
                 value={password} autoComplete="current-password"
                 onChange={(e) => setPassword(e.target.value)} required disabled={busy} />
          <button type="button" className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword} disabled={busy}>
            <PasswordEyeIcon visible={showPassword} />
          </button>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>

        <button type="button" className="linkish" onClick={resetPassword}>
          Forgot your password?
        </button>

        <p className="auth-alt">
          New here? <Link to={requestedNext
            ? `/signup?next=${encodeURIComponent(requestedNext)}`
            : "/signup"}>
            Create an account
          </Link>
        </p>
      </form>
      <SiteFooter />
    </div>
  );
}

function PasswordEyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!visible && <path d="m3 3 18 18" />}
    </svg>
  );
}



