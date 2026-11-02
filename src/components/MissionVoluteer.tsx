"use client";
import ThemedSelect from "./ThemedSelect";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { mongo } from "../lib/mongoClient";
import { useAuth } from "./Authcontext";
import { ARCHDEACONRIES } from "../lib/Constants";
import Navbar from "./Navbar";
import SiteFooter from "./Sitefooter";
import "./RegistrationForm.css";

export default function MissionVoluteer() {
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    full_name: profile?.full_name ?? "",
    church: profile?.church ?? "",
    archdeaconry: profile?.archdeaconry ?? "",
    email: profile?.email ?? "",
    phone_number: profile?.phone ?? "",
    reason_for_registering: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await mongo
        .from("village_mission")
        .insert([formData]);

      if (error) throw error;

      alert("✅ Registration successful!");
      setFormData((prev) => ({ ...prev, reason_for_registering: "" }));
    } catch (err) {
      console.error(err);
      alert("❌ Failed to submit registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-container mission-registration">
      <Navbar />

      {/* Form */}
      <main className="form-section">
        <div className="form-box mission-form-box">
          <p className="mission-eyebrow">Serve with DYO</p>
          <h2>Village mission volunteer</h2>
          <p className="mission-intro">Share a little about yourself and why you would like to serve on a village mission.</p>

          <form className="mission-form" onSubmit={handleSubmit}>
            <input
              name="full_name"
              placeholder="Full Name"
              value={formData.full_name}
              onChange={handleChange}
              required
            />

            <input
              name="church"
              placeholder="Church"
              value={formData.church}
              onChange={handleChange}
              required
            />


            <ThemedSelect
              name="archdeaconry"
              value={formData.archdeaconry}
              onChange={handleChange}
              required
            >
              <option value="">Select Archdeaconry</option>
              {ARCHDEACONRIES.map((name) => <option key={name} value={name}>{name}</option>)}
            </ThemedSelect>

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />


            <input
              name="phone_number"
              placeholder="Phone Number"
              value={formData.phone_number}
              onChange={handleChange}
              required
            />

             <textarea
              name="reason_for_registering"
              placeholder="Why Do You Want To Be Part Of The Village Mission?"
              value={formData.reason_for_registering}
              onChange={handleChange}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Register"}
            </button>
          </form>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}



