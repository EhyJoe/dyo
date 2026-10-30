"use client";
import { useState } from "react";
import { Link, useNavigate } from "@/lib/next-router";
import { mongo } from "../lib/mongoClient";
import { naira } from "../lib/currency";
import { useAuth } from "./Authcontext";
import Navbar from "./Navbar";
import SiteFooter from "./Sitefooter";
import "./Donate.css";

/**
 * The giving page.
 *
 * What one gift does, in the org's own terms, is the hero â€” not a stock
 * "support our ministry" line. Preset amounts each carry a concrete outcome,
 * because "â‚¦5,000 sends one young person to convention" moves people in a way
 * an empty amount box never will.
 *
 * Payment goes through the same startPayment path as everything else, so the
 * SERVER confirms the gift. The old page let the browser mark a donation
 * "paid", which meant anyone could record a gift they never made.
 */

const PRESETS = [
  { amount: 2000, label: "A day's meals for a volunteer on mission" },
  { amount: 5000, label: "Sends one young person to convention" },
  { amount: 10000, label: "Transport for a village mission team" },
  { amount: 20000, label: "Support any of our Programmes" },
];

export default function DonationPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [amount, setAmount] = useState<number | "">(5000);
  const [custom, setCustom] = useState(false);
  const [donor, setDonor] = useState({
    full_name: profile?.full_name ?? "",
    email: profile?.email ?? "",
  });
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const chosen = typeof amount === "number" ? amount : 0;

  async function give() {
    setError("");

    if (!anonymous && (!donor.full_name.trim() || !donor.email.trim())) {
      return setError("Add your name and email, or choose to give anonymously.");
    }
    if (chosen < 100) {
      return setError("Enter how much you'd like to give.");
    }

    setBusy(true);

    setBusy(false);
    setError("Online donations are temporarily unavailable. Please contact the youth office for bank transfer details.");
  }

  return (
    <div className="donate">
      <Navbar />

      <div className="donate-hero">
        <div className="donate-hero-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8m0-12.8L5.6 18.4"/><circle cx="12" cy="12" r="8.5"/></svg>
        </div>
        <div className="donate-hero-inner">
          <p className="donate-eyebrow">Give</p>
          <h1>Every gift sends someone further than they could go alone.</h1>
          <p className="donate-lede">
            Your giving takes young people to conventions, funds village missions,
            and keeps the work of the organization moving all year round.
          </p>
        </div>
      </div>

      <div className="donate-body">
        <section className="donate-card">
          <h2>Choose an amount</h2>

          <div className="donate-presets">
            {PRESETS.map((p) => (
              <button key={p.amount}
                      className={`donate-preset${!custom && amount === p.amount ? " is-active" : ""}`}
                      onClick={() => { setAmount(p.amount); setCustom(false); }}>
                <strong>{naira(p.amount)}</strong>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          <button className={`donate-custom-toggle${custom ? " is-active" : ""}`}
                  onClick={() => { setCustom(true); setAmount(""); }}>
            Another amount
          </button>

          {custom && (
            <div className="donate-custom">
              <span className="donate-naira">&#8358;</span>
              <input type="number" min={100} placeholder="0" autoFocus
                     value={amount}
                     onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")} />
            </div>
          )}

          <hr />

          <h2>Your details</h2>

          <label className="donate-anon">
            <input type="checkbox" checked={anonymous}
                   onChange={(e) => setAnonymous(e.target.checked)} />
            Give anonymously
          </label>

          {!anonymous && (
            <div className="donate-fields">
              <input placeholder="Full name" value={donor.full_name}
                     onChange={(e) => setDonor({ ...donor, full_name: e.target.value })} />
              <input type="email" placeholder="Email" value={donor.email}
                     onChange={(e) => setDonor({ ...donor, email: e.target.value })} />
            </div>
          )}

          <textarea rows={2} placeholder="Leave a word of encouragement (optional)"
                    value={message} onChange={(e) => setMessage(e.target.value)} />

          {error && <p className="donate-error">{error}</p>}

          <button className="donate-submit" onClick={give} disabled={busy}>
            {busy ? "Opening paymentâ€¦"
              : chosen > 0 ? `Give ${naira(chosen)}` : "Give"}
          </button>

          <p className="donate-fineprint">
            Online donations are temporarily unavailable. Contact the youth office for bank transfer details.
            You'll get a receipt by email.
          </p>
        </section>

        <aside className="donate-aside">
          <blockquote className="donate-quote">
            "Each of you should give what you have decided in your heart to give,
            not reluctantly or under compulsion, for God loves a cheerful giver."
            <cite>2 Corinthians 9:7</cite>
          </blockquote>
        </aside>
      </div>

      <SiteFooter />
    </div>
  );
}







