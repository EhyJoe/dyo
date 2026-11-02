"use client";
import ThemedSelect from "./ThemedSelect";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "@/lib/next-router";
import { mongo } from "../lib/mongoClient";
import { useAuth } from "./Authcontext";
import { naira } from "../lib/currency";
import { composeAttendingCard, DEFAULT_CARD_CONFIG } from "../lib/Attendingcard";
import Navbar from "./Navbar";
import SiteFooter from "./Sitefooter";
import "./Programmes.css";

interface ExtraField {
  key: string;
  label: string;
  type: "text" | "select" | "textarea";
  options?: string[];
  required?: boolean;
}

export default function ProgrammeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { session, profile, loading: authLoading, updateProfilePhoto } = useAuth();

  const [programme, setProgramme] = useState<any>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [registrationPhoto, setRegistrationPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  // Paid-programme registration: after the row is created, we ask HOW they're
  // paying before taking money. null = chooser not open.
  const [payMode, setPayMode] = useState<null | "choose" | "voucher" | "body">(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [passVoucherCode, setPassVoucherCode] = useState("");
  const [passBusy, setPassBusy] = useState(false);
  const [passNotice, setPassNotice] = useState("");
  const [bodyType, setBodyType] = useState<"archdeaconry" | "parish" | "church">("church");
  const [bodyName, setBodyName] = useState("");
  const [bodyCommunity, setBodyCommunity] = useState("");
  const [bodyNeedsVoucher, setBodyNeedsVoucher] = useState(false);

  // Sponsor-others flow
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const [sponsorQty, setSponsorQty] = useState(1);
  const [sponsorAnon, setSponsorAnon] = useState(false);
  const [sponsorName, setSponsorName] = useState("");

  useEffect(() => { void load(); }, [slug, session?.user.id]);

  async function load() {
    setLoading(true);
    setRegistration(null);
    setPassNotice("");
    const { data: prog } = await mongo
      .from("programmes").select("*").eq("slug", slug).maybeSingle();
    setProgramme(prog);

    if (prog && session) {
      try {
        const response = await fetch(`/api/programmes/${encodeURIComponent(slug)}/registration`, { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        const reg = response.ok ? result.registration : null;
        setRegistration(reg);
        if (reg?.pass_card_unlocked) setPassNotice("Voucher accepted. Your programme pass is unlocked.");
      } catch {
        setNotice("Couldn't load your registration. Please refresh and try again.");
      }
    }
    setLoading(false);
  }

  if (loading || authLoading) {
    return <div className="pg-detail"><Navbar /><p className="pg-status">Loading…</p></div>;
  }
  if (!programme) {
    return (
      <div className="pg-detail">
        <Navbar />
        <div className="pg-status">
          <h2>That programme isn't listed</h2>
          <p>It may have been taken down. <Link to="/programmes">See what's on</Link>.</p>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const extras: ExtraField[] = programme.extra_fields ?? [];
  const closesAt = programme.registration_closes_at
    ? new Date(programme.registration_closes_at) : null;
  const closed = closesAt ? closesAt < new Date() : false;
  const owes = registration && registration.payment_status === "pending";

  /* ---------------- register ---------------- */

  async function register() {
    if (!session || !profile) {
      navigate(`/signup?next=${encodeURIComponent(`/programmes/${slug}`)}`);
      return;
    }

    const missing = extras.filter((f) => f.required && !answers[f.key]?.trim());
    if (missing.length) {
      setNotice(`Answer: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    if (!profile.photo_url && !registrationPhoto) {
      setNotice("Please upload a profile photo to register for this programme.");
      return;
    }
    setBusy(true);
    setNotice("");

    let response: Response;
    let result: any;
    try {
      if (!profile.photo_url && registrationPhoto) {
        const photoForm = new FormData();
        photoForm.set("photo", registrationPhoto);
        const photoResponse = await fetch("/api/profile/photo", { method: "POST", body: photoForm });
        const photoResult = await photoResponse.json().catch(() => ({}));
        if (!photoResponse.ok || typeof photoResult.photo_url !== "string") {
          throw new Error(photoResult.error ?? "We couldn't upload your photo. Please try again.");
        }
        updateProfilePhoto(photoResult.photo_url);
      }
      response = await fetch(`/api/programmes/${encodeURIComponent(slug)}/registration`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      result = await response.json().catch(() => ({}));
    } catch (error) {
      setBusy(false);
      setNotice(error instanceof Error ? error.message : "We couldn't complete your registration. Check your photo and connection, then try again.");
      return;
    }
    setBusy(false);

    if (!response.ok) {
      setNotice(result.error ?? "We couldn't save that. Try again.");
      void load();
      return;
    }

    const data = result.registration;
    setRegistration(data);
    setRegistrationPhoto(null);
    // Paid programme → open the "how are you paying?" chooser.
    // Free programme → nothing more to do.
    if (programme.fee_naira > 0) setPayMode("choose");
  }

  /* ---------- sponsor others ---------- */
  async function sponsorPay() { setNotice("Online sponsorship payments are temporarily unavailable. Please contact the youth office."); }

  /* ---------- redeem a voucher ---------- */
  async function redeemVoucher(reg = registration) {
    if (!reg) return;
    if (!voucherCode.trim()) { setNotice("Enter your voucher code."); return; }

    setBusy(true);
    setNotice("");

    const { data, error } = await mongo.rpc("redeem_voucher", {
      p_code: voucherCode.trim(),
      p_programme_id: programme.id,
      p_registration_id: reg.id,
    });

    const result = Array.isArray(data) ? data[0] : data;
    setBusy(false);

    if (error || !result?.ok) {
      if (error || result?.reason) console.error("Programme voucher validation failed", error ?? result?.reason);
      setNotice("That voucher couldn't be used. Check the code and try again.");
      return;
    }

    // Voucher good → mark registration paid and stamp who sponsored it.
    await mongo.from("programme_registrations").update({
      payment_status: "paid",
      sponsor_type: result.identity_type,
      sponsor_name: result.identity_name,
      sponsor_body_type: result.body_type,
    }).eq("id", reg.id);

    setPayMode(null);
    setNotice("Voucher accepted — you're registered.");
    void load();
  }

  /* ---------- body (archdeaconry/parish/church) pays ---------- */
  async function checkBodyPaid() {
    if (!bodyName.trim()) { setNotice("Enter the name."); return; }
    setBusy(true);
    // Has this body already paid for this programme? If so, this registrant
    // must supply one of that body's voucher codes.
    const { data } = await mongo.rpc("body_has_paid", {
      p_programme_id: programme.id,
      p_name: bodyName.trim(),
    });
    setBusy(false);
    setBodyNeedsVoucher(!!data);
    if (data) {
      setNotice("This " + bodyType + " has already paid — enter the voucher code they gave you.");
    } else {
      // Not paid yet → record the body on the registration; it stays pending
      // until the body pays via their payment page.
      void recordBodyPending();
    }
  }

  async function recordBodyPending() {
    if (!registration) return;
    setBusy(true);
    await mongo.from("programme_registrations").update({
      sponsor_type: "body",
      sponsor_body_type: bodyType,
      sponsor_name: bodyName.trim(),
      sponsor_community: bodyType === "church" ? bodyCommunity.trim() || null : null,
      payment_status: "pending",
    }).eq("id", registration.id);
    setBusy(false);
    setPayMode(null);
    setNotice("Recorded. Your place is held — it's confirmed once your " + bodyType + " completes payment.");
    void load();
  }

  /* ---------------- pay ---------------- */

  async function pay(reg = registration) {
    if (!reg || !profile) return;
    setNotice("Online registration payments are temporarily unavailable. Please contact the youth office.");
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadPassCard() {
    if (!registration?.pass_card_unlocked) return;
    if (!programme.attending_tag_url) {
      setPassNotice("The programme pass card isn't available yet.");
      return;
    }
    const photo = registration.photo_url ?? profile?.photo_url;
    if (!photo) {
      setPassNotice("Add a profile photo to your account before downloading the programme pass.");
      return;
    }
    setPassBusy(true);
    setPassNotice("");
    try {
      const blob = await composeAttendingCard({
        templateUrl: programme.attending_tag_url,
        photoUrl: photo,
        details: {
          name: profile?.full_name ?? registration.full_name ?? "",
          church: registration.church ?? profile?.church,
          archdeaconry: registration.archdeaconry ?? profile?.archdeaconry,
        },
        config: programme.tag_config ?? programme.card_config ?? DEFAULT_CARD_CONFIG,
      });
      downloadBlob(blob, `${programme.slug}-programme-pass.png`);
    } catch {
      setPassNotice("Couldn't build the pass card. Try again or update your profile photo.");
    } finally {
      setPassBusy(false);
    }
  }

  async function redeemPassVoucher() {
    if (!registration || !passVoucherCode.trim()) {
      setPassNotice("Enter your programme pass voucher code.");
      return;
    }
    setPassBusy(true);
    setPassNotice("");
    try {
      const response = await fetch("/api/programme-vouchers/redeem", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: passVoucherCode, programmeId: programme.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPassNotice(result.error ?? "That code couldn't be used. Check it and try again.");
        return;
      }
      setRegistration({ ...registration, pass_card_unlocked: true });
      setPassNotice("Voucher accepted. Your programme pass is unlocked.");
      setPassVoucherCode("");
    } catch {
      setPassNotice("We couldn't check that code. Please try again.");
    } finally {
      setPassBusy(false);
    }
  }

  /* ---------------- render ---------------- */

  return (
    <div className="pg-detail">
      <Navbar />

      {(programme.banner_url || programme.flyer_url) && (
        <div className="pg-hero" style={{ backgroundImage: `url(${programme.banner_url || programme.flyer_url})` }}>
          <div className="pg-hero-inner">
            <p className="pg-eyebrow">
              {programme.starts_at
                ? new Date(programme.starts_at).toLocaleDateString("en-NG",
                    { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                : "Date to be announced"}
            </p>
            <h1>{programme.title}</h1>
            {programme.tagline && <p className="pg-tagline">{programme.tagline}</p>}
          </div>
        </div>
      )}

      <div className="pg-body">
        <article className="pg-about">
          <Link to="/programmes" className="pg-back">← All programmes</Link>
          <p className="pg-meta">
            {programme.venue && <span>{programme.venue}</span>}
            <span>{programme.fee_naira > 0 ? naira(programme.fee_naira) : "Free"}</span>
            {closesAt && <span>Registration closes {closesAt.toLocaleDateString("en-NG")}</span>}
          </p>
          <p className="pg-description">{programme.description}</p>
          {programme.flyer_url && (
            <img className="pg-flyer" src={programme.flyer_url} alt={`${programme.title} flyer`} />
          )}
        </article>

        <aside className="pg-panel">
          {!session && (
            <>
              <h3>Register for this programme</h3>
              <p className="pg-note">
                Create an account once and your details fill themselves in every
                time after this.
              </p>
              <Link className="pg-button"
                    to={`/signup?next=${encodeURIComponent(`/programmes/${slug}`)}`}>
                Create an account
              </Link>
              <Link className="pg-button pg-button--quiet"
                    to={`/login?next=${encodeURIComponent(`/programmes/${slug}`)}`}>
                I already have one
              </Link>
            </>
          )}

          {session && !registration && (
            <>
              <h3>Register as {profile?.full_name}</h3>
              <ul className="pg-prefill">
                <li>{profile?.church} · {profile?.archdeaconry}</li>
                <li>{profile?.phone}</li>
                <li>{profile?.email}</li>
              </ul>
              <Link className="pg-editlink" to="/account">Not right? Update your details</Link>

              {!profile?.photo_url && (
                <label className="pg-field">
                  <span>Your photo *</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={(event) => setRegistrationPhoto(event.target.files?.[0] ?? null)} />
                  <small>Upload a clear photo of yourself (JPG, PNG, WebP or AVIF, up to 5 MB). We'll save it to your profile.</small>
                  {registrationPhoto && <small>Selected: {registrationPhoto.name}</small>}
                  {!registrationPhoto && <small>A photo is required before you can register.</small>}
                </label>
              )}

              {extras.map((f) => (
                <label key={f.key} className="pg-field">
                  <span>{f.label}{f.required && " *"}</span>
                  {f.type === "select" ? (
                    <ThemedSelect value={answers[f.key] ?? ""}
                            onChange={(e) => setAnswers({ ...answers, [f.key]: e.target.value })}>
                      <option value="">Choose one</option>
                      {f.options?.map((o) => <option key={o}>{o}</option>)}
                    </ThemedSelect>
                  ) : f.type === "textarea" ? (
                    <textarea rows={3} value={answers[f.key] ?? ""}
                              onChange={(e) => setAnswers({ ...answers, [f.key]: e.target.value })} />
                  ) : (
                    <input value={answers[f.key] ?? ""}
                           onChange={(e) => setAnswers({ ...answers, [f.key]: e.target.value })} />
                  )}
                </label>
              ))}

              <button className="pg-button" onClick={register}
                disabled={busy || closed || (!profile?.photo_url && !registrationPhoto)}>
                {closed ? "Registration closed"
                  : busy ? "Registering…"
                  : programme.fee_naira > 0
                    ? `Register and pay ${naira(programme.fee_naira)}`
                    : "Register"}
              </button>
            </>
          )}

          {registration && (
            <>
              <h3>You're registered</h3>
              {owes ? (
                <>
                  <p className="pg-note pg-note--warn">
                    Your place is held until payment clears.
                  </p>
                  <button className="pg-button" onClick={() => pay()} disabled={busy}>
                    Pay {naira(registration.amount_naira)}
                  </button>
                  <button className="pg-button pg-button--quiet"
                          onClick={() => setPayMode("choose")}>
                    Use a voucher or body payment instead
                  </button>
                </>
              ) : (
                <p className="pg-confirmed">Confirmed · {registration.id.slice(0, 8).toUpperCase()}</p>
              )}

              <hr />
              <h4>Programme pass card</h4>
              {!programme.attending_tag_url ? (
                <p className="pg-note">The programme pass card isn't available yet.</p>
              ) : registration.pass_card_unlocked ? (
                <button className="pg-button" onClick={downloadPassCard} disabled={passBusy}>
                  {passBusy ? "Preparing pass..." : "Download programme pass card"}
                </button>
              ) : (
                <>
                  <p className="pg-note">Use a programme voucher to unlock your pass card. Your attending card remains free.</p>
                  <input className="pg-input" placeholder="Programme pass voucher"
                    value={passVoucherCode} onChange={(event) => setPassVoucherCode(event.target.value.toUpperCase())} />
                  <button className="pg-button" onClick={redeemPassVoucher} disabled={passBusy}>
                    {passBusy ? "Checking..." : "Redeem voucher"}
                  </button>
                </>
              )}
              {passNotice && <p className="pg-notice" role="status">{passNotice}</p>}
            </>
          )}

          {/* Sponsoring others is independent of your own registration —
              always available on a paid programme. */}
          {programme.fee_naira > 0 && (
            <div className="pg-sponsor-cta">
              <hr />
              <h4>Sponsor others</h4>
              <p className="pg-note">
                Pay for one or more people to attend. You'll get a voucher code
                for each — hand them out, and each registers free.
              </p>
              <button className="pg-button pg-button--quiet"
                      onClick={() => setSponsorOpen(true)} disabled={busy}>
                Sponsor people for this programme
              </button>

              <p className="pg-note" style={{ marginTop: 16 }}>
                Paying on behalf of an archdeaconry, parish or church?
              </p>
              <Link className="pg-button pg-button--quiet"
                    to={`/programmes/${slug}/body-payment`}>
                Archdeaconry / parish / church payment
              </Link>
            </div>
          )}

          {notice && <p className="pg-notice">{notice}</p>}
        </aside>
      </div>


      {/* ---- payment mode chooser (paid programmes) ---- */}
      {payMode && (
        <div className="pg-modal-scrim" onClick={() => setPayMode(null)}>
          <div className="pg-modal" onClick={(e) => e.stopPropagation()}>
            {payMode === "choose" && (
              <>
                <h3>How will you pay?</h3>
                <p className="pg-note">Choose one to complete your registration.</p>
                <button className="pg-button" onClick={() => { setPayMode(null); void pay(); }}>
                  I'll pay myself · {naira(programme.fee_naira)}
                </button>
                <button className="pg-button pg-button--quiet" onClick={() => setPayMode("voucher")}>
                  I have a sponsorship voucher
                </button>
                <button className="pg-button pg-button--quiet" onClick={() => setPayMode("body")}>
                  My archdeaconry / parish / church will pay
                </button>
              </>
            )}

            {payMode === "voucher" && (
              <>
                <h3>Enter your voucher</h3>
                <p className="pg-note">The code from whoever sponsored you.</p>
                <input className="pg-input" placeholder="Voucher code"
                       value={voucherCode}
                       onChange={(e) => setVoucherCode(e.target.value.toUpperCase())} />
                <button className="pg-button" onClick={() => redeemVoucher()} disabled={busy}>
                  {busy ? "Checking…" : "Use voucher"}
                </button>
                <button className="pg-button pg-button--quiet" onClick={() => setPayMode("choose")}>
                  Back
                </button>
              </>
            )}

            {payMode === "body" && (
              <>
                <h3>Which body is paying?</h3>
                <div className="pg-bodytype">
                  {(["archdeaconry", "parish", "church"] as const).map((b) => (
                    <button key={b} type="button"
                            className={`pg-chip${bodyType === b ? " is-active" : ""}`}
                            onClick={() => { setBodyType(b); setBodyNeedsVoucher(false); }}>
                      {b}
                    </button>
                  ))}
                </div>

                <input className="pg-input"
                       placeholder={bodyType === "church"
                         ? "Full church name — e.g. Bishop Akinyele Memorial Anglican Church"
                         : `Full ${bodyType} name (no abbreviations)`}
                       value={bodyName} onChange={(e) => setBodyName(e.target.value)} />

                {bodyType === "church" && (
                  <input className="pg-input" placeholder="Community / location — e.g. Akinyele"
                         value={bodyCommunity} onChange={(e) => setBodyCommunity(e.target.value)} />
                )}

                {bodyNeedsVoucher ? (
                  <>
                    <p className="pg-note pg-note--warn">
                      This {bodyType} has already paid — enter the voucher code they gave you.
                    </p>
                    <input className="pg-input" placeholder="Voucher code"
                           value={voucherCode}
                           onChange={(e) => setVoucherCode(e.target.value.toUpperCase())} />
                    <button className="pg-button" onClick={() => redeemVoucher()} disabled={busy}>
                      {busy ? "Checking…" : "Use voucher"}
                    </button>
                  </>
                ) : (
                  <button className="pg-button" onClick={checkBodyPaid} disabled={busy}>
                    {busy ? "Checking…" : "Continue"}
                  </button>
                )}

                <button className="pg-button pg-button--quiet" onClick={() => setPayMode("choose")}>
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---- sponsor others modal ---- */}
      {sponsorOpen && (
        <div className="pg-modal-scrim" onClick={() => setSponsorOpen(false)}>
          <div className="pg-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sponsor others</h3>
            <p className="pg-note">
              Pay for one or more people. You'll get a voucher code for each, to
              hand out — they register free with it.
            </p>

            <label className="pg-field-label">How many people?</label>
            <input className="pg-input" type="number" min={1} style={{ textTransform: "none" }}
                   value={sponsorQty}
                   onChange={(e) => setSponsorQty(Math.max(1, Number(e.target.value)))} />

            <label className="pg-field-label">Your name on the receipt</label>
            <input className="pg-input" style={{ textTransform: "none" }}
                   placeholder="Your name"
                   value={sponsorName} disabled={sponsorAnon}
                   onChange={(e) => setSponsorName(e.target.value)} />

            <label className="pg-check">
              <input type="checkbox" checked={sponsorAnon}
                     onChange={(e) => setSponsorAnon(e.target.checked)} />
              Give anonymously
            </label>

            <div className="pg-total">
              Total: <strong>{naira(programme.fee_naira * sponsorQty)}</strong>
              <span className="pg-total-sub">{sponsorQty} × {naira(programme.fee_naira)}</span>
            </div>

            <button className="pg-button" onClick={sponsorPay} disabled={busy}>
              {busy ? "Starting…" : `Online payment unavailable`}
            </button>
            <button className="pg-button pg-button--quiet" onClick={() => setSponsorOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}







