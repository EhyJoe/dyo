"use client";
import ThemedSelect from "./ThemedSelect";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "@/lib/next-router";
const logo = "/assets/dyo%20logo.png";
import { ARCHDEACONRIES } from "../lib/Constants";
import Navbar from "./Navbar";
import SiteFooter from "./Sitefooter";
import "./Auth.css";

/**
 * One sign-up, then every future programme registration is three taps.
 *
 * Network handling matters more here than anywhere else on the site: this runs
 * on Nigerian mobile data, and a request that dies mid-flight must not strand
 * someone on a dead button. Every path below resets the form state.
 */

const SIGNUP_TIMEOUT_MS = 20_000;

/** Rejects if a promise takes too long, so the UI can never hang forever. */
function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

const isNetworkError = (err: unknown) => {
  const m = (err as Error)?.message?.toLowerCase() ?? "";
  return m.includes("fetch") || m.includes("network") || m.includes("timeout");
};

export default function Signup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [form, setForm] = useState({
    full_name: "", email: "", password: "", confirm_password: "", phone: "", gender: "",
    date_of_birth: "", archdeaconry: "", church: "", occupation: "",
    educational_qualification: "", address: "",
  });
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photo]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setError("");
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const parseBirthDate = (value: string): string | null => {
    // The calendar picker may provide ISO directly; typed/display dates use DD/MM/YYYY.
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (isoMatch) {
      const [, yearText, monthText, dayText] = isoMatch;
      const isoDate = new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
      if (isoDate.getFullYear() === Number(yearText) && isoDate.getMonth() === Number(monthText) - 1 && isoDate.getDate() === Number(dayText)) {
        return `${yearText}-${monthText}-${dayText}`;
      }
      return null;
    }
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
    if (!match) return null;
    const [, dayText, monthText, yearText] = match;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return `${yearText}-${monthText}-${dayText}`;
  };

  const dobIso = parseBirthDate(form.date_of_birth);
  const dobDate = dobIso ? new Date(`${dobIso}T00:00:00`) : null;
  const age = dobDate ? (Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000) : -1;
  const requiredFieldsComplete =
    form.full_name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
    form.password.length >= 8 &&
    form.confirm_password.length > 0 && form.password === form.confirm_password &&
    form.phone.trim().length >= 7 &&
    (form.gender === "Male" || form.gender === "Female") &&
    !!dobDate && dobDate <= new Date() && age >= 5 && age <= 120 &&
    !!form.archdeaconry && form.church.trim().length > 0;
  const confirmPasswordMismatch = form.confirm_password.length > 0 && form.password !== form.confirm_password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const missing: string[] = [];
    if (form.full_name.trim().length < 2) missing.push("full name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) missing.push("a valid email address");
    if (form.password.length < 8) missing.push("a password with at least 8 characters");
    if (!form.confirm_password) missing.push("password confirmation");
    if (form.phone.trim().length < 7) missing.push("phone number");
    if (!form.gender) missing.push("gender");
    if (!parseBirthDate(form.date_of_birth)) missing.push("date of birth");
    if (!form.archdeaconry) missing.push("archdeaconry");
    if (!form.church.trim()) missing.push("church");
    if (missing.length) {
      setError(`Please complete ${missing.join(", ")}.`);
      return;
    }
    if (form.password !== form.confirm_password) {
      setError("Your passwords don't match. Check both password fields and try again.");
      return;
    }

    if (!navigator.onLine) {
      return setError("You're offline. Reconnect and try again — nothing has been lost.");
    }

    const normalizedDob = parseBirthDate(form.date_of_birth);
    if (!normalizedDob) {
      return setError("Enter your date of birth as DD/MM/YYYY, for example 09/04/2000.");
    }

    // Sanity-check the date of birth — catch future dates and impossible years.
    if (normalizedDob) {
      const dob = new Date(`${normalizedDob}T00:00:00`);
      const today = new Date();
      const age = (today.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (dob > today) {
        return setError("Your date of birth can't be in the future — please check the year.");
      }
      if (age < 5) {
        return setError("Please enter your real date of birth (the year looks off).");
      }
      if (age > 120) {
        return setError("Please check your date of birth — that year seems too far back.");
      }
    }

    setBusy(true);

    try {
      const payload = new FormData();
      payload.set("fields", JSON.stringify({
        ...form,
        date_of_birth: normalizedDob,
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        church: form.church.trim(),
        archdeaconry: form.archdeaconry.trim(),
      }));
      if (photo) payload.set("photo", photo);
      const response = await withTimeout(fetch("/api/auth/signup", {
        method: "POST",
        body: payload,
      }), SIGNUP_TIMEOUT_MS);
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Account creation failed. Try again.");
        return;
      }
      navigate(`/signup-success${next ? `?next=${encodeURIComponent(next)}` : ""}`, { replace: true });
    } catch (err) {
      setError(
        isNetworkError(err)
          ? "We couldn't reach the server — check your connection and try again. Your details are still here."
          : "Something went wrong creating the account. Try again.",
      );
    } finally {
      // Runs whatever happened above, so the button always comes back.
      setBusy(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-page">
        <form className="auth-card" onSubmit={submit} noValidate>
        <img src={logo} alt="Diocesan Youth Organization" className="auth-logo" />
        <h1>Create your account</h1>

        <p className="auth-sub">
          Register once. After this, signing up for a programme takes seconds and
          your attendance card is generated for you.
        </p>

        <div className="signup-photo">
          <span className="signup-photo-label">Profile picture <span className="signup-photo-optional">(optional)</span></span>
          <p className="signup-photo-hint">Add a clear photo so people can recognize you. JPG, PNG, WebP or AVIF, up to 5 MB.</p>
          {photoPreview ? (
            <img className="signup-photo-preview" src={photoPreview} alt="Profile picture preview" />
          ) : (
            <div className="signup-photo-blank" aria-hidden="true"><span>Add a photo</span></div>
          )}
          <label className="signup-photo-btn" htmlFor="signup-photo-input">{photo ? "Choose a different photo" : "Choose photo"}</label>
          <input
            id="signup-photo-input"
            className="signup-photo-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={busy}
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              if (selected && selected.size > 5 * 1024 * 1024) {
                setError("Please choose an image smaller than 5 MB.");
                event.target.value = "";
                return;
              }
              setError("");
              setPhoto(selected);
            }}
          />
        </div>

        <div className="grid-2">
          <input name="full_name" placeholder="Full name" value={form.full_name}
                 onChange={set} required disabled={busy} />
          <ThemedSelect name="gender" value={form.gender} onChange={set} required disabled={busy}>
            <option value="">Gender</option>
            <option>Male</option>
            <option>Female</option>
          </ThemedSelect>

          <input type="email" name="email" placeholder="Email" value={form.email}
                 onChange={set} required disabled={busy} autoComplete="email" />
          <input name="phone" placeholder="Phone number" value={form.phone}
                 onChange={set} required disabled={busy} autoComplete="tel" />

          <div className="password-field">
            <input type={showPassword ? "text" : "password"} name="password"
                   placeholder="Password (min. 8 characters)" minLength={8}
                   value={form.password} onChange={set} required disabled={busy}
                   autoComplete="new-password" />
            <button type="button" className="password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword} disabled={busy}>
              <PasswordEyeIcon visible={showPassword} />
            </button>
          </div>
          <div className="password-field">
            <input type={showConfirmPassword ? "text" : "password"}
                   name="confirm_password" placeholder="Confirm password"
                   value={form.confirm_password} onChange={set} required
                   disabled={busy} autoComplete="new-password" />
            <button type="button" className="password-toggle"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    aria-pressed={showConfirmPassword} disabled={busy}>
              <PasswordEyeIcon visible={showConfirmPassword} />
            </button>
          </div>
          {confirmPasswordMismatch && (
            <p className="signup-password-mismatch" role="status">
              Confirm password doesn’t match the password yet.
            </p>
          )}
          <label className="signup-field-label">
            Date of birth
            <span className="signup-field-hint">Select your birth date using the calendar.</span>
          </label>
          <div className="signup-birthdate-field">
            <input
              className="signup-birthdate-calendar"
              type="date"
              name="date_of_birth_picker"
              aria-label="Choose date of birth from calendar"
              max={new Date().toISOString().slice(0, 10)}
              value={parseBirthDate(form.date_of_birth) ?? ""}
              onChange={(event) => {
                const isoDate = event.currentTarget.value;
                if (!isoDate) return;
                setError("");
                setForm((current) => ({ ...current, date_of_birth: isoDate }));
              }}
              disabled={busy}
            />
            <span className="signup-birthdate-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <rect x="3.5" y="5" width="17" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M4 10h16" />
              </svg>
            </span>
            <span className="signup-birthdate-value" aria-live="polite">
              {dobIso ? `${dobIso.slice(8, 10)}/${dobIso.slice(5, 7)}/${dobIso.slice(0, 4)}` : "DD/MM/YYYY"}
            </span>
          </div>

          <ThemedSelect name="archdeaconry" value={form.archdeaconry} required disabled={busy}
                        onChange={(e) => { setError(""); setForm((current) => ({ ...current, archdeaconry: e.target.value })); }}>
            <option value="">Archdeaconry</option>
            {ARCHDEACONRIES.map((name) => <option key={name} value={name}>{name}</option>)}
          </ThemedSelect>
          <input name="church" placeholder="Church" value={form.church}
                 onChange={set} required disabled={busy} />

          <input name="occupation" placeholder="Occupation" value={form.occupation}
                 onChange={set} disabled={busy} />
          <ThemedSelect name="educational_qualification" value={form.educational_qualification}
                        onChange={set} disabled={busy}>
            <option value="">Highest qualification (optional)</option>
            <option value="Msc">Msc</option>
            <option value="Bsc">Bsc</option>
            <option value="HND">HND</option>
            <option value="OND">OND</option>
            <option value="SSCE">SSCE</option>
            <option value="Others">Others</option>
          </ThemedSelect>
        </div>

        <input name="address" placeholder="Address" value={form.address}
               onChange={set} disabled={busy} />

        {error && <p ref={errorRef} className="auth-error" role="alert" tabIndex={-1}>{error}</p>}

        <button type="submit" disabled={busy || !requiredFieldsComplete}>
          {busy ? "Creating your account…" : "Create account"}
        </button>

        <p className="auth-alt">
          Already have an account? <Link to={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
        </p>
        </form>
        <SiteFooter />
      </div>
    </>
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




