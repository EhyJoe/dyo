"use client";
import ThemedSelect from "./ThemedSelect";
import { useEffect, useState } from "react";
import { Link } from "@/lib/next-router";
import { mongo } from "../lib/mongoClient";
import { useAuth } from "./Authcontext";
import { ARCHDEACONRIES } from "../lib/Constants";
import { naira } from "../lib/currency";
import Navbar from "./Navbar";
import SiteFooter from "./Sitefooter";
import "./Account.css";

const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

async function prepareProfilePhoto(file: File): Promise<File> {
  if (!PROFILE_PHOTO_TYPES.includes(file.type) || file.size > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error("Choose a JPG, PNG, WebP or AVIF image under 5 MB.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth < 80 || image.naturalHeight < 80) {
      throw new Error("Choose a clearer photo at least 80 pixels wide and tall.");
    }
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("That image couldn't be prepared. Choose another photo.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) throw new Error("That image couldn't be prepared. Choose another photo.");
    return new File([blob], "profile-photo.jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith("Choose a clearer") || error.message.startsWith("That image couldn't be prepared"))) throw error;
    throw new Error("That image couldn't be opened. Choose another photo.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
export default function AccountPage() {
  const { session, profile, refreshProfile, updateProfilePhoto } = useAuth();
  const [form, setForm] = useState<any>({});
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(""); return; }
    const preview = URL.createObjectURL(photoFile);
    setPhotoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [photoFile]);

  useEffect(() => {
    if (profile) {
      setForm(profile);
    }
  }, [profile]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const [{ data: regs }, { data: ords }] = await Promise.all([
        mongo.from("programme_registrations")
          .select("*, programmes(title, slug, starts_at)")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false }),
        mongo.from("orders")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false }),
      ]);
      setRegistrations(regs ?? []);
      setOrders(ords ?? []);
    })();
  }, [session]);

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  async function changePhoto(file?: File) {
    if (!file || !session) return;
    setPhotoFile(file);
    setPhotoConfirmed(false);
    setMessage("");
  }

  async function savePhoto() {
    if (!photoFile || !session) return;
    if (!photoConfirmed) {
      setMessage("Please confirm the photo shows you before saving it.");
      return;
    }
    setBusy(true);
    setMessage("");
    const previousPhotoUrl = profile?.photo_url ?? null;
    let optimisticPhotoSet = false;
    try {
      const uploadFile = await prepareProfilePhoto(photoFile);
      if (photoPreview) {
        updateProfilePhoto(photoPreview);
        optimisticPhotoSet = true;
      }
      const payload = new FormData();
      payload.set("photo", uploadFile);
      const response = await fetch("/api/profile/photo", { method: "POST", body: payload });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We couldn't update your profile photo. Please try again.");
      if (typeof result.photo_url === "string") {
        updateProfilePhoto(result.photo_url);
        setForm((current: any) => ({ ...current, photo_url: result.photo_url }));
      }
      setPhotoFile(null);
      setPhotoConfirmed(false);
      setMessage("Photo updated.");
    } catch (err) {
      if (optimisticPhotoSet) updateProfilePhoto(previousPhotoUrl);
      const detail = err instanceof Error ? err.message : "";
      setMessage(detail.startsWith("Choose ") || detail.startsWith("That image")
        ? detail
        : "We couldn't update your profile photo. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const normalizedDob = form.date_of_birth ? String(form.date_of_birth).slice(0, 10) : null;
    if (normalizedDob && new Date(`${normalizedDob}T00:00:00`) > new Date()) {
      setMessage("Your date of birth can't be in the future. Check the day, month and year.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        full_name: form.full_name, gender: form.gender, date_of_birth: normalizedDob,
        archdeaconry: form.archdeaconry, church: form.church, occupation: form.occupation,
        educational_qualification: form.educational_qualification,
        phone: form.phone, address: form.address,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "We couldn't save your profile right now. Please try again.");
        return;
      }
      if (result.profile) {
        setForm(result.profile);
      }
      setMessage("Saved.");
      await refreshProfile();
    } catch (err) {
      console.error("Profile update failed", err);
      setMessage("We couldn't save your changes right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="account">
      <Navbar />

      <header className="account-head">
        <p className="account-eyebrow">Your account</p>
        <h1>{profile?.full_name || "My account"}</h1>
        <p>{profile?.email}</p>
      </header>

      {/* Prompt members whose date of birth looks wrong (future or impossible
          year) to correct it — their birthday won't be right otherwise. */}
      {(() => {
        if (!profile?.date_of_birth) return null;
        const dob = new Date(profile.date_of_birth);
        const today = new Date();
        const age = (today.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
        if (dob > today || age < 5 || age > 120) {
          return (
            <div className="account-dob-warning">
              ⚠️ Your date of birth looks incorrect ({dob.toLocaleDateString("en-NG",
                { day: "numeric", month: "long", year: "numeric" })}).
              Please update it below with your correct birth date so your birthday shows on the right day.
            </div>
          );
        }
        return null;
      })()}

      <div className="account-body">
        {/* photo + details */}
        <section className="account-card">
          <div className="account-photo-row">
            {photoPreview
              ? <img src={photoPreview} alt="Selected profile photo preview" className="account-avatar" />
              : profile?.photo_url
              ? <img src={profile.photo_url} alt="" className="account-avatar" />
              : <div className="account-avatar account-avatar--blank">
                  {profile?.full_name?.[0] ?? "?"}
                </div>}
            <div>
              <p className="account-photo-title">Profile photo</p>
              <p className="account-photo-note">
                {photoFile ? "Previewing your selected photo. Confirm and save it to update your profile." : "Choose a clear photo of yourself and confirm it before saving."}
              </p>
              <div className="account-photo-actions">
                <label className={`account-photo-picker${busy ? " is-busy" : ""}`}>
                  {busy ? "Updating photo…" : profile?.photo_url ? "Change photo" : "Choose a photo"}
                  <input type="file" accept="image/*" aria-label="Choose a profile photo"
                         onChange={(e) => changePhoto(e.target.files?.[0])} disabled={busy} />
                </label>
                {profile?.photo_url && !photoFile && (
                  <span className="account-photo-current" role="status">
                    <span aria-hidden="true">✓</span> Current photo saved
                  </span>
                )}
              </div>
              {photoFile && <div className="account-photo-confirm">
                {photoPreview && <img src={photoPreview} alt="Selected profile photo preview" className="account-avatar" />}
                <p>{photoFile.name}</p>
                <label><input type="checkbox" checked={photoConfirmed} onChange={(e) => setPhotoConfirmed(e.target.checked)} />
                  I confirm this is a real photo of me.</label>
                <button type="button" className="account-save" onClick={savePhoto} disabled={busy || !photoConfirmed}>
                  {busy ? "Saving photo…" : "Save photo"}
                </button>
              </div>}
            </div>
          </div>

          <div className="account-grid">
            <label>Full name
              <input name="full_name" value={form.full_name ?? ""} onChange={set} />
            </label>
            <label>Gender
              <ThemedSelect name="gender" value={form.gender ?? ""} onChange={set}>
                <option value="">Choose</option><option>Male</option><option>Female</option>
              </ThemedSelect>
            </label>
            <label>Phone
              <input name="phone" value={form.phone ?? ""} onChange={set} />
            </label>
            <label>Date of birth
              <input type="date" name="date_of_birth" value={form.date_of_birth?.slice(0, 10) ?? ""}
                     max={new Date().toISOString().split("T")[0]} onChange={set} />
            </label>
            <label>Archdeaconry
              <ThemedSelect name="archdeaconry" value={form.archdeaconry ?? ""}
                            onChange={(e) => setForm((current: any) => ({ ...current, archdeaconry: e.target.value }))}>
                <option value="">Choose</option>
                {ARCHDEACONRIES.map((name) => <option key={name} value={name}>{name}</option>)}
              </ThemedSelect>
            </label>
            <label>Church
              <input name="church" value={form.church ?? ""} onChange={set} />
            </label>
            <label>Occupation
              <input name="occupation" value={form.occupation ?? ""} onChange={set} />
            </label>
            <label>Highest qualification
              <input name="educational_qualification"
                     value={form.educational_qualification ?? ""} onChange={set} />
            </label>
          </div>
          <label className="account-full">Address
            <input name="address" value={form.address ?? ""} onChange={set} />
          </label>

          {message && <p className="account-message" role="status" aria-live="polite">{message}</p>}

          <button className="account-save" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </section>

        {/* registrations */}
        <section className="account-section">
          <h2 className="account-section-title">
            <span className="account-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3v3m10-3v3M4 8h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z"/><path d="m9 14 2 2 4-4"/></svg></span>
            My programmes
          </h2>
          {registrations.length === 0 ? (
            <p className="account-empty">
              You haven't registered for anything yet.{" "}
              <Link to="/programmes">See what's on</Link>.
            </p>
          ) : (
            <div className="account-list">
              {registrations.map((r) => (
                <Link key={r.id} to={`/programmes/${r.programmes?.slug}`} className="account-row">
                  <span>
                    <strong>{r.programmes?.title}</strong>
                    {r.programmes?.starts_at &&
                      <em>{" · "}{new Date(r.programmes.starts_at).toLocaleDateString("en-NG")}</em>}
                  </span>
                  <span className={`account-pill ${
                    r.payment_status === "pending" ? "is-due" : "is-ok"}`}>
                    {r.payment_status === "pending" ? "Payment due" : "Confirmed"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* orders */}
        <section className="account-section">
          <h2 className="account-section-title">
            <span className="account-section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 4h2l2.1 10.1a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.2L21 7H6"/><circle cx="10" cy="19" r="1.2"/><circle cx="18" cy="19" r="1.2"/></svg></span>
            My orders
          </h2>
          {orders.length === 0 ? (
            <p className="account-empty">
              Nothing ordered yet. <Link to="/store">Visit the store</Link>.
            </p>
          ) : (
            <div className="account-list">
              {orders.map((o) => (
                <Link key={o.id} to={`/orders/${o.id}`} className="account-row">
                  <span>{o.order_number} · {new Date(o.created_at).toLocaleDateString("en-NG")}</span>
                  <span>{naira(o.total_naira)} · {o.status}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}


