"use client";
import ThemedSelect from "./ThemedSelect";
import { useCallback, useEffect, useState } from "react";
import { mongo } from "../lib/mongoClient";

type Programme = { id: string; title: string; attending_tag_url?: string | null };
type PassVoucher = { id: string; code: string; used: boolean; created_at?: string };

function randomCode(length: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return `PASS-${Array.from(bytes, (byte) => chars[byte % chars.length]).join("")}`;
}

export default function VoucherGenerator() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [programmeId, setProgrammeId] = useState("");
  const [vouchers, setVouchers] = useState<PassVoucher[]>([]);
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await mongo.from("programmes")
        .select("id, title, attending_tag_url")
        .eq("is_published", true)
        .order("starts_at", { ascending: false });
      const published = (data ?? []) as Programme[];
      setProgrammes(published);
      setProgrammeId(published[0]?.id ?? "");
      setLoading(false);
    })();
  }, []);

  const loadVouchers = useCallback(async () => {
    if (!programmeId) { setVouchers([]); return; }
    const { data } = await mongo.from("vouchers")
      .select("id, code, used, created_at")
      .eq("programme_id", programmeId)
      .eq("purpose", "programme_pass")
      .order("created_at", { ascending: false });
    setVouchers((data ?? []) as PassVoucher[]);
  }, [programmeId]);

  useEffect(() => { void loadVouchers(); }, [loadVouchers]);

  async function createVouchers() {
    setMessage("");
    const programme = programmes.find((item) => item.id === programmeId);
    if (!programme) { setMessage("Choose a published programme."); return; }
    if (!programme.attending_tag_url) { setMessage("Upload a programme pass card in the programme editor first."); return; }
    if (!Number.isInteger(count) || count < 1 || count > 500) {
      setMessage("Choose a quantity from 1 to 500."); return;
    }

    setSaving(true);
    const codes = new Set<string>();
    while (codes.size < count) codes.add(randomCode(8));
    const rows = Array.from(codes, (code) => ({
      code, programme_id: programmeId, purpose: "programme_pass",
      used: false, used_by: null, registration_id: null, source: "admin",
    }));
    const { error } = await mongo.from("vouchers").insert(rows);
    setSaving(false);
    if (error) { setMessage("Couldn't save the vouchers. Please try again."); return; }
    setMessage(`${count} programme pass voucher${count === 1 ? "" : "s"} generated.`);
    void loadVouchers();
  }

  function downloadCSV() {
    if (!vouchers.length) return;
    const title = programmes.find((item) => item.id === programmeId)?.title ?? "programme";
    const rows = ["Code,Status", ...vouchers.map((item) => `${item.code},${item.used ? "Used" : "Available"}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pass-vouchers-${title.replace(/[^a-z0-9]+/gi, "-")}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-1 text-2xl font-bold">Programme pass vouchers</h1>
      <p className="mb-6 text-gray-600">
        Generate one-use codes for published programmes. A registrant enters a code to unlock and download their programme pass card.
      </p>

      <section className="mb-6 grid gap-4 rounded-xl border bg-white p-5 shadow-sm sm:grid-cols-[1fr_150px_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-medium">
          Published programme
          <ThemedSelect className="w-full rounded border px-3 py-2" value={programmeId}
            onChange={(event) => { setProgrammeId(event.target.value); setMessage(""); }}>
            {programmes.length === 0 && <option value="">No published programmes</option>}
            {programmes.map((programme) => <option key={programme.id} value={programme.id}>{programme.title}</option>)}
          </ThemedSelect>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Number of codes
          <input className="w-full rounded border px-3 py-2" type="number" min={1} max={500}
            value={count} onChange={(event) => setCount(Number(event.target.value))} />
        </label>
        <button onClick={createVouchers} disabled={saving || loading || !programmeId}
          className="rounded bg-[#800000] px-4 py-2 font-semibold text-white disabled:opacity-60">
          {saving ? "Generating..." : "Generate codes"}
        </button>
        {message && <p className="text-sm text-gray-700 sm:col-span-3" role="status">{message}</p>}
        {programmeId && !programmes.find((item) => item.id === programmeId)?.attending_tag_url && (
          <p className="text-sm text-amber-800 sm:col-span-3">This programme needs a pass-card image before vouchers can unlock downloads.</p>
        )}
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Generated codes <span className="text-sm font-normal text-gray-500">({vouchers.length})</span></h2>
          <button onClick={downloadCSV} disabled={!vouchers.length} className="rounded border px-3 py-2 text-sm font-semibold disabled:opacity-50">
            Download CSV
          </button>
        </div>
        {loading ? <p className="text-sm text-gray-500">Loading programmes...</p>
          : !programmeId ? <p className="text-sm text-gray-500">Publish a programme to generate its pass vouchers.</p>
            : vouchers.length === 0 ? <p className="text-sm text-gray-500">No pass vouchers generated for this programme yet.</p>
              : <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                  <thead><tr className="border-b bg-gray-50"><th className="px-3 py-2">Code</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Created</th></tr></thead>
                  <tbody>{vouchers.map((voucher) => (
                    <tr key={voucher.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono font-semibold">{voucher.code}</td>
                      <td className="px-3 py-2">{voucher.used ? "Used" : "Available"}</td>
                      <td className="px-3 py-2 text-gray-600">{voucher.created_at ? new Date(voucher.created_at).toLocaleDateString("en-NG") : "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>}
      </section>
    </div>
  );
}
