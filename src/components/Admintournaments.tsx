"use client";
import ThemedSelect from "./ThemedSelect";
import { useEffect, useState } from "react";
import { mongo } from "../lib/mongoClient";
import TournamentFields from "./Tournamentfields";
import TournamentRegistrations from "./Tournamentregistrations";
import { ARCHDEACONRIES } from "../lib/Constants";
import { uploadPublicFile } from "../lib/Storage";
import MatchConsole from "./Matchconsole";
import TournamentBracket from "./TournamentBracket";

/**
 * Tournament management — Stage 1.
 *
 * Create tournaments, add teams, draw fixtures, and update scores. Standings
 * update automatically when a fixture is marked finished (a DB trigger does
 * the maths). Registration forms and realtime come in later stages.
 */
type Tournament = {
  id: string; name: string; slug: string; team_type: string;
  status: string; starts_on: string | null; ends_on: string | null;
  banner_url?: string | null; card_template_url?: string | null; format?: string;
};
type Team = { id: string; name: string; archdeaconry?: string | null; group_name: string | null; played: number; won: number; drawn: number;
  lost: number; goals_for: number; goals_against: number; points: number };
type Fixture = { id: string; home_team: string | null; away_team: string | null;
  round: string | null; venue: string | null; kickoff_at: string | null;
  status: string; is_published?: boolean; home_score: number; away_score: number; minute: number | null };

type TabKey = "teams" | "fixtures" | "standings" | "bracket" | "fields" | "registrations";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("teams");
  const [consoleFixture, setConsoleFixture] = useState<any>(null);
  const [savingTournament, setSavingTournament] = useState(false);
  const [tournamentMessage, setTournamentMessage] = useState("");
  const [uploadingImage, setUploadingImage] = useState<"banner_url" | "card_template_url" | null>(null);
  const [tournamentForm, setTournamentForm] = useState({ name: "", status: "upcoming", starts_on: "", ends_on: "" });

  // new tournament form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("archdeaconry");
  const [newFormat, setNewFormat] = useState("league");

  // new team / fixture
  const [teamName, setTeamName] = useState("");
  const [teamArchs, setTeamArchs] = useState<string[]>([]);
  const [teamGroup, setTeamGroup] = useState("");  // which group (A, B, ...)
  const [fx, setFx] = useState({ home: "", away: "", round: "", venue: "", kickoff: "" });

  useEffect(() => { void loadTournaments(); }, []);
  useEffect(() => {
    if (!selected) return;
    setTeamArchs([]);
    setTeamGroup("");
    setTournamentForm({
      name: selected.name,
      status: selected.status || "upcoming",
      starts_on: selected.starts_on?.slice(0, 10) ?? "",
      ends_on: selected.ends_on?.slice(0, 10) ?? "",
    });
    setTournamentMessage("");
    void loadDetail();
  }, [selected?.id]);

  async function loadTournaments() {
    setLoading(true);
    const { data } = await mongo.from("tournaments").select("*").order("created_at", { ascending: false });
    setTournaments(data ?? []);
    setLoading(false);
  }

  async function loadDetail() {
    if (!selected) return;
    const [{ data: t }, { data: f }] = await Promise.all([
      mongo.from("tournament_teams").select("*").eq("tournament_id", selected.id).order("points", { ascending: false }),
      mongo.from("fixtures").select("*").eq("tournament_id", selected.id).order("kickoff_at", { ascending: true }),
    ]);
    setTeams(t ?? []);
    setFixtures(f ?? []);
  }

  async function saveStanding(team: Team) {
    const { error } = await mongo.from("tournament_teams").update({
      played: Number(team.played) || 0, won: Number(team.won) || 0,
      drawn: Number(team.drawn) || 0, lost: Number(team.lost) || 0,
      goals_for: Number(team.goals_for) || 0, goals_against: Number(team.goals_against) || 0,
      points: Number(team.points) || 0,
    }).eq("id", team.id);
    if (error) { alert("Couldn't save this standings row. Please try again."); return; }
    void loadDetail();
  }

  function editStanding(teamId: string, field: keyof Team, value: string) {
    setTeams((current) => current.map((team) => team.id === teamId
      ? { ...team, [field]: Math.max(0, Number(value) || 0) } : team));
  }

  async function createTournament() {
    if (!newName.trim()) return;
    const { error } = await mongo.from("tournaments").insert({
      name: newName.trim(), slug: slugify(newName), team_type: newType, format: newFormat, status: "upcoming",
    });
    if (error) { alert("Couldn't save that tournament. Please try again."); return; }
    setNewName("");
    void loadTournaments();
  }

  async function saveTournamentChanges() {
    if (!selected || !tournamentForm.name.trim()) {
      setTournamentMessage("Enter a tournament name before saving.");
      return;
    }
    setSavingTournament(true);
    setTournamentMessage("");
    const changes = {
      name: tournamentForm.name.trim(),
      status: tournamentForm.status,
      starts_on: tournamentForm.starts_on || null,
      ends_on: tournamentForm.ends_on || null,
    };
    try {
      const { error } = await mongo.from("tournaments").update(changes).eq("id", selected.id);
      if (error) {
        setTournamentMessage("Couldn't save these tournament changes. Please try again.");
        return;
      }
      setSelected({ ...selected, ...changes });
      setTournaments((current) => current.map((tournament) => tournament.id === selected.id
        ? { ...tournament, ...changes } : tournament));
      setTournamentMessage("Tournament changes saved.");
    } catch {
      setTournamentMessage("Couldn't save these tournament changes. Please try again.");
    } finally {
      setSavingTournament(false);
    }
  }

  async function addTeam() {
    if (!selected) return;
    const isArchdeaconryLeague = selected.team_type === "archdeaconry";
    if (isArchdeaconryLeague) {
      const alreadyAdded = new Set(teams.map((team) => team.archdeaconry || team.name));
      const names = teamArchs.filter((name) => !alreadyAdded.has(name));
      if (names.length === 0) { alert("Choose one or more archdeaconries that are not already in this league."); return; }
      const { error } = await mongo.from("tournament_teams").insert(names.map((name) => ({
        tournament_id: selected.id, name, slug: slugify(name), archdeaconry: name,
        group_name: teamGroup || null,
        played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0,
      })));
      if (error) { alert("Couldn't save those teams. Please try again."); return; }
    } else {
      if (!teamName.trim()) return;
      const { error } = await mongo.from("tournament_teams").insert({
        tournament_id: selected.id, name: teamName.trim(), slug: slugify(teamName),
        group_name: teamGroup || null,
        played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0,
      });
      if (error) { alert("Couldn't save that team. Please try again."); return; }
    }
    setTeamName(""); setTeamArchs([]); setTeamGroup("");
    void loadDetail();
  }

  async function removeTeam(id: string) {
    if (!confirm("Remove this team?")) return;
    await mongo.from("tournament_teams").delete().eq("id", id);
    void loadDetail();
  }

  async function deleteTournament(t: Tournament) {
    if (!confirm(`Delete "${t.name}" and everything in it (teams, fixtures, registrations)? This cannot be undone.`)) return;
    const { error } = await mongo.from("tournaments").delete().eq("id", t.id);
    if (error) { alert("Couldn't update that tournament. Please try again."); return; }
    void loadTournaments();
  }

  async function deleteFixture(id: string) {
    if (!confirm("Delete this fixture?")) return;
    await mongo.from("fixtures").delete().eq("id", id);
    void loadDetail();
  }

  async function uploadTournamentImage(field: "banner_url" | "card_template_url", file?: File) {
    if (!file || !selected) return;
    setUploadingImage(field);
    try {
      const url = await uploadPublicFile("programme-media", file, `tournaments/${selected.slug}`);
      const { error } = await mongo.from("tournaments").update({ [field]: url }).eq("id", selected.id);
      if (error) { alert("Couldn't save those details. Please try again."); return; }
      setSelected({ ...selected, [field]: url });
      setTournaments((current) => current.map((tournament) => tournament.id === selected.id
        ? { ...tournament, [field]: url } : tournament));
    } catch { alert("Upload failed. Try again."); }
    finally { setUploadingImage(null); }
  }

  async function addFixture() {
    if (!selected || !fx.home || !fx.away || fx.home === fx.away) {
      alert("Pick two different teams."); return;
    }
    const { error } = await mongo.from("fixtures").insert({
      tournament_id: selected.id,
      home_team: fx.home, away_team: fx.away,
      round: fx.round || null, venue: fx.venue || null,
      kickoff_at: fx.kickoff ? new Date(fx.kickoff).toISOString() : null,
      status: "scheduled", is_published: false,
    });
    if (error) { alert("Couldn't update that tournament. Please try again."); return; }
    setFx({ home: "", away: "", round: "", venue: "", kickoff: "" });
    void loadDetail();
  }

  async function setFixturePublished(fixture: Fixture, is_published: boolean) {
    const { error } = await mongo.from("fixtures").update({ is_published }).eq("id", fixture.id);
    if (error) { alert("Couldn't update fixture publishing. Please try again."); return; }
    void loadDetail();
  }

  async function publishAllFixtures() {
    if (!selected) return;
    const unpublished = fixtures.filter((fixture) => fixture.is_published === false);
    if (unpublished.length === 0) return;
    const { error } = await mongo.from("fixtures").update({ is_published: true })
      .eq("tournament_id", selected.id).eq("is_published", false);
    if (error) { alert("Fixtures couldn't be published. Please try again."); return; }
    void loadDetail();
  }

  function toggleArchdeaconry(name: string) {
    setTeamArchs((current) => current.includes(name)
      ? current.filter((item) => item !== name)
      : [...current, name]);
  }

  // Draw a simple round-robin: everyone plays everyone once.
  async function drawRoundRobin() {
    if (!selected || teams.length < 2) { alert("Add at least two teams first."); return; }

    // Group the teams. For group_knockout/league with groups, draw a
    // round-robin WITHIN each group. Ungrouped teams form one pool.
    const byGroup: Record<string, Team[]> = {};
    for (const t of teams) {
      const key = t.group_name || "_all";
      (byGroup[key] ??= []).push(t);
    }

    const rows: any[] = [];
    for (const [group, list] of Object.entries(byGroup)) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          rows.push({
            tournament_id: selected.id,
            home_team: list[i].id, away_team: list[j].id,
            stage: "group",
            group_name: group === "_all" ? null : group,
            round: group === "_all" ? "League" : `Group ${group}`,
          });
        }
      }
    }

    if (rows.length === 0) { alert("Nothing to draw."); return; }
    if (!confirm(`Draw ${rows.length} group fixture(s)?`)) return;
    const { error } = await mongo.from("fixtures").insert(rows);
    if (error) { alert("Couldn't delete that tournament. Please try again."); return; }
    void loadDetail();
  }

  function prettyRound(stage: string) {
    return stage === "final" ? "Final" : stage === "semi" ? "Semi-final"
      : stage === "quarter" ? "Quarter-final" : stage === "round_16" ? "Round of 16"
      : stage === "round_32" ? "Round of 32" : "Round";
  }

  // Top N of each group by points (for seeding a bracket after groups).
  function qualifiedTeams(perGroup = 2): Team[] {
    const groups = Array.from(new Set(teams.map((t) => t.group_name).filter(Boolean))) as string[];
    if (groups.length === 0) return teams;
    const out: Team[] = [];
    for (const g of groups.sort()) {
      const sorted = teams.filter((t) => t.group_name === g).sort((a, b) =>
        b.points - a.points ||
        (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against));
      out.push(...sorted.slice(0, perGroup));
    }
    return out;
  }

  // Build a knockout bracket: create every round (up to the final) and wire
  // each winner to advance to the next round's fixture.
  async function drawBracket(bracketTeams: Team[]) {
    if (!selected) return;
    const n = bracketTeams.length;
    if (n < 2) { alert("Need at least 2 teams for a bracket."); return; }

    let size = 1; while (size < n) size *= 2;
    const roundName = (slots: number) =>
      slots === 2 ? "final" : slots === 4 ? "semi" : slots === 8 ? "quarter"
        : slots === 16 ? "round_16" : slots === 32 ? "round_32" : "round";

    if (!confirm(`Create a ${size}-team knockout bracket (byes for empty slots)?`)) return;

    const shuffled = [...bracketTeams].sort(() => Math.random() - 0.5);

    const rounds: string[][] = [];
    let slots = size;
    while (slots >= 2) {
      const count = slots / 2;
      const stage = roundName(slots);
      const ids: string[] = [];
      for (let i = 0; i < count; i++) {
        const { data, error } = await mongo.from("fixtures").insert({
          tournament_id: selected.id, stage, bracket_slot: i, round: prettyRound(stage),
        }).select("id").single();
        if (error) { alert("Couldn't save those details. Please try again."); return; }
        ids.push(data!.id);
      }
      rounds.push(ids);
      slots = count;
    }

    for (let r = 0; r < rounds.length - 1; r++) {
      for (let i = 0; i < rounds[r].length; i++) {
        await mongo.from("fixtures").update({
          advances_to: rounds[r + 1][Math.floor(i / 2)],
          advances_as_home: i % 2 === 0,
        }).eq("id", rounds[r][i]);
      }
    }

    const first = rounds[0];
    for (let i = 0; i < first.length; i++) {
      await mongo.from("fixtures").update({
        home_team: shuffled[i * 2]?.id ?? null,
        away_team: shuffled[i * 2 + 1]?.id ?? null,
      }).eq("id", first[i]);
    }

    void loadDetail();
  }

  async function updateScore(f: Fixture, home: number, away: number) {
    await mongo.from("fixtures").update({ home_score: home, away_score: away }).eq("id", f.id);
    void loadDetail();
  }

  async function setFixtureStatus(f: Fixture, status: string, minute?: number) {
    await mongo.from("fixtures").update({ status, ...(minute !== undefined ? { minute } : {}) }).eq("id", f.id);
    void loadDetail();
  }

  const teamName_ = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "—";

  if (loading) return <div className="p-6">Loading…</div>;

  // ---- tournament list / create ----
  if (!selected) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Tournaments</h1>
        <p className="text-gray-600 mb-6">Create and manage football competitions.</p>

        <div className="border rounded-lg p-4 mb-6 bg-gray-50">
          <h2 className="font-semibold mb-3">New tournament</h2>
          <div className="flex flex-wrap gap-2">
            <input className="border rounded px-3 py-2 flex-1 min-w-[200px]"
                   placeholder="Tournament name" value={newName}
                   onChange={(e) => setNewName(e.target.value)} />
            <ThemedSelect className="border rounded px-3 py-2" value={newType}
                    onChange={(e) => setNewType(e.target.value)}>
              <option value="archdeaconry">Archdeaconries</option>
              <option value="parish">Parishes</option>
              <option value="church">Churches</option>
              <option value="mixed">Mixed</option>
            </ThemedSelect>
            <ThemedSelect className="border rounded px-3 py-2" value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value)}>
              <option value="league">League (table)</option>
              <option value="knockout">Knockout (bracket)</option>
              <option value="group_knockout">Groups + knockout</option>
            </ThemedSelect>
            <button onClick={createTournament} className="bg-[#800000] text-white px-4 py-2 rounded">
              Create
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {tournaments.map((t) => (
            <div key={t.id} className="border rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-gray-500 capitalize">{t.team_type} · {t.status.replace("_", " ")}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelected(t)} className="bg-[#800000] text-white px-4 py-2 rounded">
                  Manage
                </button>
                <button onClick={() => deleteTournament(t)} className="text-red-600 px-3 py-2 text-sm">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {tournaments.length === 0 && <p className="text-gray-500">No tournaments yet.</p>}
        </div>
      </div>
    );
  }

  // ---- single tournament management ----
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => setSelected(null)} className="text-[#800000] underline text-sm mb-3">
        ← All tournaments
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">{selected.name}</h1>
        <ThemedSelect className="border rounded px-3 py-2" value={tournamentForm.status}
                onChange={(e) => setTournamentForm({ ...tournamentForm, status: e.target.value })}>
          <option value="upcoming">Upcoming</option>
          <option value="registration_open">Registration open</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </ThemedSelect>
      </div>

      <section className="mb-5 grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium sm:col-span-2">
          Tournament name
          <input className="rounded border px-3 py-2 font-normal" value={tournamentForm.name}
            onChange={(event) => setTournamentForm({ ...tournamentForm, name: event.target.value })} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Starts on
          <input type="date" className="rounded border px-3 py-2 font-normal" value={tournamentForm.starts_on}
            onChange={(event) => setTournamentForm({ ...tournamentForm, starts_on: event.target.value })} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Ends on
          <input type="date" className="rounded border px-3 py-2 font-normal" value={tournamentForm.ends_on}
            onChange={(event) => setTournamentForm({ ...tournamentForm, ends_on: event.target.value })} />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button onClick={saveTournamentChanges} disabled={savingTournament}
            className="rounded bg-[#800000] px-4 py-2 font-semibold text-white disabled:opacity-60">
            {savingTournament ? "Saving..." : "Save changes"}
          </button>
          {tournamentMessage && <p role="status" className="text-sm text-gray-600">{tournamentMessage}</p>}
        </div>
      </section>

      {/* Flyer + card template uploads */}
      <div className="flex flex-wrap gap-4 mb-5 text-sm">
        <label className={`border rounded px-3 py-2 cursor-pointer bg-gray-50 ${uploadingImage === "banner_url" ? "opacity-60" : ""}`}>
          {uploadingImage === "banner_url" ? "Uploading..." : selected.banner_url ? "Change flyer" : "Upload flyer"}
          <input type="file" accept="image/*" hidden disabled={uploadingImage !== null}
                 onChange={(e) => uploadTournamentImage("banner_url", e.target.files?.[0])} />
        </label>
        <label className={`border rounded px-3 py-2 cursor-pointer bg-gray-50 ${uploadingImage === "card_template_url" ? "opacity-60" : ""}`}>
          {uploadingImage === "card_template_url" ? "Uploading..." : selected.card_template_url ? "Change card template" : "Upload card template"}
          <input type="file" accept="image/*" hidden disabled={uploadingImage !== null}
                 onChange={(e) => uploadTournamentImage("card_template_url", e.target.files?.[0])} />
        </label>
        {selected.card_template_url && (
          <a href={selected.card_template_url} target="_blank" rel="noreferrer" className="text-blue-600 underline self-center">
            View template
          </a>
        )}
      </div>

      <div className="flex gap-2 mb-5">
        {(["teams", "fixtures",
          ...(selected.format !== "knockout" ? ["standings"] : []),
          ...(selected.format !== "league" ? ["bracket"] : []),
          "fields", "registrations"] as TabKey[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded capitalize ${tab === t ? "bg-[#800000] text-white" : "bg-gray-100"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "teams" && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {selected.team_type !== "archdeaconry" && (
              <input className="border rounded px-3 py-2 flex-1 min-w-[180px]" placeholder="Team name"
                     value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            )}
            {/* Group picker for group-based formats */}
            {(selected.format === "group_knockout" || selected.format === "league") && (
              <ThemedSelect className="border rounded px-3 py-2" value={teamGroup}
                      onChange={(e) => setTeamGroup(e.target.value)}>
                <option value="">Group… (optional)</option>
                {["A", "B", "C", "D", "E", "F", "G", "H"].map((g) =>
                  <option key={g} value={g}>Group {g}</option>)}
              </ThemedSelect>
            )}
            {selected.team_type !== "archdeaconry" && (
              <button onClick={addTeam} className="bg-[#800000] text-white px-4 py-2 rounded">Add team</button>
            )}
          </div>
          {selected.team_type === "archdeaconry" && (
            <section className="mb-4 rounded-lg border bg-gray-50 p-4" aria-label="Choose league archdeaconries">
              <h3 className="font-semibold">Choose participating archdeaconries</h3>
              <p className="mb-3 mt-1 text-sm text-gray-600">Click each archdeaconry you want in this league.</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {ARCHDEACONRIES.filter((name) => !teams.some((team) => (team.archdeaconry || team.name) === name)).map((name) => {
                  const picked = teamArchs.includes(name);
                  return <button key={name} type="button" aria-pressed={picked}
                    onClick={() => toggleArchdeaconry(name)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${picked
                      ? "border-[#800000] bg-[#800000] text-white"
                      : "border-gray-300 bg-white text-gray-800 hover:border-[#800000]"}`}>
                    {name}
                  </button>;
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-600">{teamArchs.length} selected</span>
                <button onClick={addTeam} disabled={teamArchs.length === 0}
                  className="rounded bg-[#800000] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                  Add selected archdeaconries
                </button>
              </div>
            </section>
          )}
          <div className="grid gap-2">
            {teams.map((t: any) => (
              <div key={t.id} className="border rounded p-3 flex justify-between items-center">
                <span>{t.name}{t.group_name && <span className="text-xs text-gray-500 ml-2">Group {t.group_name}</span>}</span>
                <button onClick={() => removeTeam(t.id)} className="text-red-600 text-sm">Remove</button>
              </div>
            ))}
            {teams.length === 0 && <p className="text-gray-500">No teams yet.</p>}
          </div>
        </div>
      )}

      {tab === "fixtures" && (
        <div>
          <div className="border rounded-lg p-4 mb-4 bg-gray-50">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Add a fixture</h3>
              {fixtures.some((fixture) => fixture.is_published === false) && (
                <button onClick={publishAllFixtures} className="rounded bg-[#800000] px-3 py-2 text-sm font-semibold text-white">
                  Publish all fixtures ({fixtures.filter((fixture) => fixture.is_published === false).length})
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-2 mb-2">
              <ThemedSelect className="border rounded px-3 py-2" value={fx.home}
                      onChange={(e) => setFx({ ...fx, home: e.target.value })}>
                <option value="">Home team</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </ThemedSelect>
              <ThemedSelect className="border rounded px-3 py-2" value={fx.away}
                      onChange={(e) => setFx({ ...fx, away: e.target.value })}>
                <option value="">Away team</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </ThemedSelect>
              <input className="border rounded px-3 py-2" placeholder="Round (e.g. Group A)"
                     value={fx.round} onChange={(e) => setFx({ ...fx, round: e.target.value })} />
              <input className="border rounded px-3 py-2" placeholder="Venue"
                     value={fx.venue} onChange={(e) => setFx({ ...fx, venue: e.target.value })} />
              <input type="datetime-local" className="border rounded px-3 py-2"
                     value={fx.kickoff} onChange={(e) => setFx({ ...fx, kickoff: e.target.value })} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={addFixture} className="bg-[#800000] text-white px-4 py-2 rounded">Add fixture</button>
              {/* League / groups → round-robin */}
              {(selected.format === "league" || selected.format === "group_knockout") && (
                <button onClick={drawRoundRobin} className="bg-gray-200 px-4 py-2 rounded">
                  Draw group fixtures
                </button>
              )}
              {/* Knockout → straight bracket from all teams */}
              {selected.format === "knockout" && (
                <button onClick={() => drawBracket(teams)} className="bg-gray-800 text-white px-4 py-2 rounded">
                  Build knockout bracket
                </button>
              )}
              {/* Groups+knockout → bracket from group qualifiers */}
              {selected.format === "group_knockout" && (
                <button onClick={() => drawBracket(qualifiedTeams(2))} className="bg-gray-800 text-white px-4 py-2 rounded">
                  Build bracket (top 2 per group)
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            {fixtures.map((f) => (
              <div key={f.id} className="border rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">{f.round}{f.venue ? ` · ${f.venue}` : ""}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    f.status === "live" ? "bg-red-100 text-red-700"
                      : f.status === "finished" ? "bg-gray-200" : "bg-blue-50 text-blue-700"}`}>
                    {f.status || "scheduled"}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${f.is_published === false ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
                    {f.is_published === false ? "Draft" : "Published"}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span className="font-medium flex-1 text-right">{teamName_(f.home_team)}</span>
                  <input type="number" min={0} className="border rounded w-14 text-center py-1"
                         value={f.home_score}
                         onChange={(e) => updateScore(f, Number(e.target.value), f.away_score)} />
                  <span>–</span>
                  <input type="number" min={0} className="border rounded w-14 text-center py-1"
                         value={f.away_score}
                         onChange={(e) => updateScore(f, f.home_score, Number(e.target.value))} />
                  <span className="font-medium flex-1">{teamName_(f.away_team)}</span>
                </div>
                <div className="flex gap-2 justify-center flex-wrap">
                  <button onClick={() => setFixtureStatus(f, "live", 0)} className="text-xs px-3 py-1 rounded bg-red-600 text-white">Kick off</button>
                  <button onClick={() => setFixtureStatus(f, "half_time")} className="text-xs px-3 py-1 rounded bg-gray-200">Half time</button>
                  <button onClick={() => setFixtureStatus(f, "finished")} className="text-xs px-3 py-1 rounded bg-gray-800 text-white">Full time</button>
                  <button onClick={() => deleteFixture(f.id)} className="text-xs px-3 py-1 rounded text-red-600">Delete</button>
                  <button onClick={() => setFixturePublished(f, f.is_published === false)}
                    className={`text-xs px-3 py-1 rounded font-semibold ${f.is_published === false ? "bg-[#800000] text-white" : "border border-gray-300 bg-white text-gray-700"}`}>
                    {f.is_published === false ? "Publish to website" : "Unpublish"}
                  </button>
                </div>
                <div className="flex justify-center mt-2">
                  <button onClick={() => setConsoleFixture(f)} className="text-xs px-4 py-1.5 rounded bg-[#800000] text-white">⚽ Manage match (goals, cards)</button>
                </div>
              </div>
            ))}
            {fixtures.length === 0 && <p className="text-gray-500">No fixtures yet.</p>}
          </div>
        </div>
      )}

      {consoleFixture && (
        <MatchConsole fixture={consoleFixture}
          onClose={() => { setConsoleFixture(null); void loadDetail(); }} />
      )}

      {tab === "bracket" && (
        <TournamentBracket tournamentId={selected.id}
          teams={Object.fromEntries(teams.map((t) => [t.id, t.name]))} />
      )}

      {tab === "fields" && <TournamentFields tournamentId={selected.id} />}
      {tab === "registrations" && <TournamentRegistrations tournamentId={selected.id} />}

      {tab === "standings" && (
        <div className="overflow-x-auto">
          {(() => {
            // Group teams by group_name; ungrouped teams fall under one table.
            const groups = Array.from(new Set(teams.map((t) => t.group_name).filter(Boolean))) as string[];
            const blocks = groups.length > 0
              ? groups.sort().map((g) => ({ title: `Group ${g}`, rows: teams.filter((t) => t.group_name === g) }))
              : [{ title: "Table", rows: teams }];
            return blocks.map((block) => {
              const sorted = [...block.rows].sort((a, b) =>
                b.points - a.points ||
                (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against) ||
                b.goals_for - a.goals_for);
              return (
                <div key={block.title} className="mb-6">
                  <h3 className="font-semibold mb-2">{block.title}</h3>
                  <table className="w-full border text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-2 py-1 text-left">Team</th>
                        <th className="border px-2 py-1">P</th>
                        <th className="border px-2 py-1">W</th>
                        <th className="border px-2 py-1">D</th>
                        <th className="border px-2 py-1">L</th>
                        <th className="border px-2 py-1">GF</th>
                        <th className="border px-2 py-1">GA</th>
                        <th className="border px-2 py-1">GD</th>
                        <th className="border px-2 py-1">Pts</th>
                        <th className="border px-2 py-1">Edit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((t) => (
                        <tr key={t.id}>
                          <td className="border px-2 py-1">{t.name}</td>
                          {(["played", "won", "drawn", "lost", "goals_for", "goals_against"] as const).map((field) => (
                            <td className="border px-1 py-1 text-center" key={field}>
                              <input aria-label={`${t.name} ${field.replaceAll("_", " ")}`} type="number" min="0" className="w-14 rounded border px-1 py-1 text-center"
                                     value={t[field]} onChange={(event) => editStanding(t.id, field, event.target.value)} />
                            </td>
                          ))}
                          <td className="border px-2 py-1 text-center">{t.goals_for - t.goals_against}</td>
                          <td className="border px-1 py-1 text-center"><input aria-label={`${t.name} points`} type="number" min="0" className="w-14 rounded border px-1 py-1 text-center font-bold" value={t.points} onChange={(event) => editStanding(t.id, "points", event.target.value)} /></td>
                          <td className="border px-2 py-1 text-center"><button className="a-btn a-btn--ghost" onClick={() => void saveStanding(t)}>Save</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}


