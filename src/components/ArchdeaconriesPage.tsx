"use client";
import { useEffect, useState } from "react";
import { Link } from "@/lib/next-router";
import { mongo } from "../lib/mongoClient";
import Navbar from "./Navbar";
import SiteFooter from "./Sitefooter";
import "./Content.css";

export default function ArchdeaconriesPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    void mongo.from("archdeaconries").select("*").order("sort_order", { ascending: true })
      .then(({ data }) => setRows(data ?? []));
  }, []);

  return <div className="content-page">
    <Navbar />
    <header className="content-head"><p className="content-eyebrow">Ibadan North Diocese</p><h1>Our archdeaconries</h1><p>Find local youth programmes, stories and photos from across the diocese.</p></header>
    <main className="content-body">
      {rows.length ? <div className="blog-grid">{rows.map((row) => <Link key={row.id} to={`/archdeaconry/${row.slug}`} className="blog-card">
        {row.cover_url || row.image_url ? <img src={row.cover_url || row.image_url} alt="" loading="lazy" /> : <div className="archdeaconry-card-placeholder" aria-hidden="true">DYO</div>}
        <div className="blog-card-body"><h2>{row.name}</h2><p className="blog-excerpt">{row.blurb || row.description || "Explore programmes and updates from this archdeaconry."}</p><span>View archdeaconry →</span></div>
      </Link>)}</div> : <p>Archdeaconry pages are being prepared.</p>}
    </main>
    <SiteFooter />
  </div>;
}
