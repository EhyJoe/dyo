"use client";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@/lib/next-router";
import { mongo } from "../lib/mongoClient";
import { useAuth } from "./Authcontext";
import Navbar from "./Navbar";
import SiteFooter from "./Sitefooter";
import "./HomePage.css";

const pic1 = "/assets/pic11.jpg";
const pic2 = "/assets/pic111.jpg";
const pic3 = "/assets/pic1.jpg";
const pic4 = "/assets/pic1111.jpg";
const pic5 = "/assets/pic11111.jpg";
const bishop = "/assets/bishop.jpg";
const chap = "/assets/chap.jpg";
const achap = "/assets/achap.jpg";

/**
 * Each slide carries its own words, so the write-up changes as the images
 * cycle instead of one fixed caption sitting over five different photos.
 * Edit these freely â€” the carousel uses however many you give it.
 */
const SLIDES = [
  {
    image: pic1,
    eyebrow: "Ibadan North Diocese",
    heading: "Come and grow with us",
    body: "Conventions, retreats, village missions and everything in between. Register once, and you're set for all of it.",
    cta: { label: "See what's on", to: "/programmes" },
  },
  {
    image: pic2,
    eyebrow: "Every archdeaconry",
    heading: "One family, thirteen archdeaconries",
    body: "From Agodi to Yemetu, young people meeting, serving and growing together all year round.",
    cta: { label: "Our programmes", to: "/programmes" },
  },
  {
    image: pic3,
    eyebrow: "Village missions",
    heading: "Take the good news further",
    body: "Volunteer for a village mission and spend a weekend where the need is greatest.",
    cta: { label: "Volunteer", to: "/mission-voluteer" },
  },
  {
    image: pic4,
    eyebrow: "Worship and praise",
    heading: "Lift your voice with us",
    body: "Praise nights, drama, choir and everything that makes our gatherings what they are.",
    cta: { label: "See what's on", to: "/programmes" },
  },
  {
    image: pic5,
    eyebrow: "Support the work",
    heading: "Every gift goes further here",
    body: "Your giving sends young people to conventions they could not otherwise attend.",
    cta: { label: "Give", to: "/donate" },
  },
];

/** Shown only if the leadership table is empty or hasn't loaded yet. */
const FALLBACK_CLERGY = [
  { id: "f1", photo_url: bishop, full_name: "Most Rev'd Williams Aladekugbe",
    role: "Archbishop, Province of Ibadan\nBishop, Ibadan North Diocese" },
  { id: "f2", photo_url: chap, full_name: "Ven. Dr. Ilori L. Tolu-Kehinde",
    role: "Diocesan Youth Chaplain" },
  { id: "f3", photo_url: achap, full_name: "Rev. Canon Adebayo Olayinka",
    role: "Assistant Diocesan Youth Chaplain" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [leadership, setLeadership] = useState<any[]>([]);

  const [programmes, setProgrammes] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [slides, setSlides] = useState(SLIDES);

  /* ---------- carousel ---------- */
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  /* ---------- live content ---------- */
  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();

      const [{ data: progs }, { data: liveSlides }, { data: tournamentsList }] =
        await Promise.all([
        mongo.from("programmes").select("*")
          .eq("is_published", true)
          .or(`starts_at.gte.${nowIso},starts_at.is.null`)
          .order("starts_at", { ascending: true }),
        mongo.from("carousel_slides").select("*")
          .eq("is_active", true).order("sort_order", { ascending: true }),
        mongo.from("tournaments").select("*").order("created_at", { ascending: false }).limit(3),
      ]);

      if (liveSlides?.length) {
        setSlides(liveSlides.map((slide: any) => ({
          image: slide.image_url,
          eyebrow: slide.eyebrow ?? "Ibadan North Diocese",
          heading: slide.heading,
          body: slide.body ?? "",
          cta: { label: slide.cta_label ?? "See what's on", to: slide.cta_url ?? "/programmes" },
        })));
        setCurrent(0);
      }

      const { data: leaders } = await mongo
        .from("leadership").select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setLeadership(leaders ?? []);

      setProgrammes(progs ?? []);
      setTournaments(tournamentsList ?? []);
    })();
  }, []);

  const clergy = leadership.filter((m) => m.tier === "clergy");
  const excos = leadership.filter((m) => m.tier === "exco");
  const regularProgrammes = programmes.filter((p) => p.programme_type !== "village_mission");

  function openProgramme(slug: string) {
    const target = `/programmes/${slug}`;
    if (!session) navigate(`/login?next=${encodeURIComponent(target)}`);
    else navigate(target);
  }

  return (
    <div className="home">
      <Navbar />

      {/* ---------- carousel ---------- */}
      <section
        className="home-carousel"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-roledescription="carousel"
      >
        {slides.map((slide, i) => (
          <img key={slide.image} src={slide.image} alt=""
               className={`home-slide${i === current ? " is-active" : ""}`} />
        ))}

        <div className="home-carousel-shade" />

        {/* One caption per slide, cross-fading with the image behind it. */}
        {slides.map((slide, i) => (
          <div key={slide.heading}
               className={`home-carousel-overlay${i === current ? " is-active" : ""}`}
               aria-hidden={i !== current}>
            <div className="home-carousel-text">
              <p className="home-eyebrow">
                {session && i === 0 && profile?.full_name
                  ? `Welcome back, ${profile.full_name.split(" ")[0]}`
                  : slide.eyebrow}
              </p>
              <h1>{slide.heading}</h1>
              <p className="home-lede">{slide.body}</p>
              <div className="home-hero-actions">
                <Link to={slide.cta.to} className="home-btn"
                      tabIndex={i === current ? 0 : -1}>
                  {slide.cta.label}
                </Link>
                {session ? (
                  <Link to="/account" className="home-btn home-btn--ghost"
                        tabIndex={i === current ? 0 : -1}>
                    My account
                  </Link>
                ) : (
                  <Link to="/signup" className="home-btn home-btn--ghost"
                        tabIndex={i === current ? 0 : -1}>
                    Create an account
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}

        <button className="home-arrow left" aria-label="Previous slide"
                onClick={() => setCurrent((c) => (c - 1 + slides.length) % slides.length)}>
          &#10094;
        </button>
        <button className="home-arrow right" aria-label="Next slide"
                onClick={() => setCurrent((c) => (c + 1) % slides.length)}>
          &#10095;
        </button>

        <div className="home-dots">
          {slides.map((slide, i) => (
            <button key={slide.heading} aria-label={slide.heading}
                    aria-current={i === current}
                    className={i === current ? "is-active" : ""}
                    onClick={() => setCurrent(i)} />
          ))}
        </div>
      </section>

      <section className="home-section home-section--tint">
        <div className="home-section-head">
          <h2>Village missions</h2>
          <Link to="/mission-voluteer">Volunteer for a mission</Link>
        </div>
        <p>Join the diocesan youth team in taking the good news and practical service to our villages.</p>
      </section>

      {tournaments.length > 0 && (
        <section className="home-section">
          <div className="home-section-head"><h2>Football tournaments</h2><Link to="/tournaments">All tournaments</Link></div>
          <div className="home-prog-grid">
            {tournaments.map((tournament) => <Link key={tournament.id} to={`/tournaments/${tournament.slug}`} className="home-prog home-tournament-card">
              <div className={`home-tournament-image${tournament.banner_url ? "" : " is-placeholder"}`}>
                {tournament.banner_url ? <img src={tournament.banner_url} alt="" loading="lazy" /> : (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4a4 4 0 0 1-8 0zM8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 0v5m-4 3h8m-6-3h4" /></svg>
                )}
              </div>
              <div className="home-prog-body"><h3>{tournament.name}</h3><p className="home-prog-venue">{String(tournament.status || "upcoming").replaceAll("_", " ")}</p></div>
            </Link>)}
          </div>
        </section>
      )}

      {/* ---------- leadership ---------- */}
      {regularProgrammes.length > 0 && (
        <section className="home-section home-section--tint">
          <div className="home-section-head">
            <h2>Available programmes</h2>
            <Link to="/programmes">View programmes</Link>
          </div>
          <div className="home-prog-grid">
            {regularProgrammes.map((p) => (
              <button key={p.id} type="button" onClick={() => openProgramme(p.slug)} className="home-prog home-prog-button">
                <img className={p.flyer_url ? undefined : "home-prog-placeholder"}
                  src={p.flyer_url || "/assets/dyo%20logo.png"} alt="" loading="lazy" />
                <div className="home-prog-body">
                  <p className="home-prog-date">
                    {p.starts_at
                      ? new Date(p.starts_at).toLocaleDateString("en-NG",
                          { day: "numeric", month: "short", year: "numeric" })
                      : "Date coming"}
                  </p>
                  <h3>{p.title}</h3>
                  {p.venue && <p className="home-prog-venue">{p.venue}</p>}
                  <span className="home-prog-fee">
                    {p.fee_naira > 0 ? naira(p.fee_naira) : "Free"}
                  </span>
                  <span className="home-prog-register-hint">Sign in to register</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="home-section home-section--tint">
        <div className="home-section-head"><h2>Our leadership</h2></div>

        <div className="home-clergy">
          {(clergy.length > 0 ? clergy : FALLBACK_CLERGY).map((m: any) => (
            <figure key={m.id} className="home-clergy-card">
              {m.photo_url
                ? <img src={m.photo_url} alt={m.full_name} loading="lazy" />
                : <div className="home-avatar-blank">{m.full_name[0]}</div>}
              <figcaption>
                <strong>{m.full_name}</strong>
                <span>{m.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        {excos.length > 0 && (
          <>
            <h3 className="home-exco-heading">Diocesan Youth Executives </h3>
            <div className="home-exco-grid">
              {excos.map((m: any) => (
                <figure key={m.id} className="home-exco-card" title={m.bio ?? undefined}>
                  {m.photo_url
                    ? <img src={m.photo_url} alt={m.full_name} loading="lazy" />
                    : <div className="home-avatar-blank">{m.full_name[0]}</div>}
                  <figcaption>
                    <strong>{m.full_name}</strong>
                    <span>{m.role}</span>
                    {m.archdeaconry && <em>{m.archdeaconry}</em>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}


