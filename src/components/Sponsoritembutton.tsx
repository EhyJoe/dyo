"use client";
import { useState } from "react";
import { useNavigate } from "@/lib/next-router";
import { mongo } from "../lib/mongoClient";
import { naira } from "../lib/currency";
import { useAuth } from "./Authcontext";
import "./Store.css";

/**
 * "Sponsor this item" — drop-in button + modal for a store product.
 *
 * The sponsor pays the item's price and chooses what happens:
 *   • Voucher — they get a code to give someone, who claims the item free.
 *   • Lucky draw — a sitewide draw for the item; the winner claims it free.
 *
 * On payment the settle function mints the voucher or creates the draw
 * (awaiting admin setup). Voucher sponsors land on a receipt with the code.
 */
export default function SponsorItemButton({
  product,
}: {
  product: { id: string; name: string; price_naira: number };
}) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"voucher" | "lucky_draw">("voucher");
  const [anon, setAnon] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function sponsor() { setNotice("Online sponsorship payments are temporarily unavailable. Please contact the youth office."); }

  return (
    <>
      <button className="store-sponsor-btn" onClick={() => setOpen(true)}>
        Sponsor this item
      </button>

      {open && (
        <div className="store-modal-scrim" onClick={() => setOpen(false)}>
          <div className="store-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Sponsor {product.name}</h3>
            <p className="store-modal-price">{naira(product.price_naira)}</p>

            <p className="store-modal-label">How should it be given?</p>
            <div className="store-mode-row">
              <button className={`store-mode${mode === "voucher" ? " is-active" : ""}`}
                      onClick={() => setMode("voucher")}>
                <strong>Voucher code</strong>
                <span>You get a code to give to someone specific.</span>
              </button>
              <button className={`store-mode${mode === "lucky_draw" ? " is-active" : ""}`}
                      onClick={() => setMode("lucky_draw")}>
                <strong>Lucky draw</strong>
                <span>A sitewide draw — a lucky member wins it.</span>
              </button>
            </div>

            <label className="store-anon">
              <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
              Sponsor anonymously
            </label>
            {!anon && (
              <input className="store-input" placeholder="Your name (shown as the sponsor)"
                     value={name} onChange={(e) => setName(e.target.value)} />
            )}

            {notice && <p className="store-note">{notice}</p>}

            <button className="store-sponsor-btn store-sponsor-btn--go"
                    onClick={sponsor} disabled={busy}>
              {busy ? "Starting…" : `Online payment unavailable`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}







