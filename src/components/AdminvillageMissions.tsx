"use client";
import { useEffect, useState } from "react";
import { mongo } from "../lib/mongoClient";

type Volunteer = {
  id: string; full_name?: string; church?: string; archdeaconry?: string;
  email?: string; phone_number?: string; reason_for_registering?: string; status?: string;
};

export default function AdminVillageMissions() {
  const [rows, setRows] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await mongo.from("village_mission").select("*").order("id", { ascending: false });
    setRows(data ?? []);
    setMessage(error ? "Could not load village mission registrations." : "");
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function setStatus(row: Volunteer, status: string) {
    const { error } = await mongo.from("village_mission").update({ status }).eq("id", row.id);
    if (error) { setMessage("Could not update this volunteer. Please try again."); return; }
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, status } : item));
    setMessage("Volunteer status updated.");
  }

  return (
    <section>
      <header className="a-head">
        <div>
          <p className="a-eyebrow">Programmes · Outreach</p>
          <h1>Village missions</h1>
          <p>Review volunteer applications and update their follow-up status.</p>
        </div>
        <span className="a-pill">{rows.length} volunteers</span>
      </header>
      {message && <p className="admin-error-alert" role="status">{message}</p>}
      {loading ? <p>Loading registrations…</p> : rows.length === 0 ? (
        <div className="a-empty"><h3>No volunteers yet</h3><p>New submissions from the public village mission form will appear here.</p></div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead><tr><th>Volunteer</th><th>Church / archdeaconry</th><th>Contact</th><th>Why they want to serve</th><th>Status</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.full_name || "Unnamed"}</strong></td>
                <td>{row.church || "—"}<br /><small>{row.archdeaconry || ""}</small></td>
                <td>{row.email && <a href={`mailto:${row.email}`}>{row.email}</a>}<br />{row.phone_number && <a href={`tel:${row.phone_number}`}>{row.phone_number}</a>}</td>
                <td>{row.reason_for_registering || "—"}</td>
                <td><select aria-label={`Follow-up status for ${row.full_name || "volunteer"}`} value={row.status || "New"} onChange={(event) => void setStatus(row, event.target.value)}>
                  <option>New</option><option>Contacted</option><option>Accepted</option><option>Not proceeding</option>
                </select></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
