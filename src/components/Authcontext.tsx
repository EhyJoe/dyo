"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export interface Profile {
  id: string;
  full_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  archdeaconry: string | null;
  church: string | null;
  occupation: string | null;
  educational_qualification: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  photo_url: string | null;
  role: "member" | "admin" | "super_admin" | "archdeaconry_admin";
  managed_archdeaconry: string | null;
  admin_sections: string[] | null;
}

export interface UserSession { user: { id: string; email: string } }
interface AuthValue {
  session: UserSession | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canAccess: (section: string) => boolean;
  refreshProfile: () => Promise<void>;
  updateProfilePhoto: (photoUrl: string | null) => void;
  acceptLogin: (user: UserSession["user"], profile: Profile) => void;
  signOut: () => Promise<void>;
}

export const ADMIN_SECTIONS = [
  "overview", "programmes", "registrations", "store", "orders", "donations", "receipts", "draws", "vouchers", "tags",
  "announcements", "gallery", "blog", "carousel", "leadership", "archdeaconries", "pages", "members", "birthdays", "tournaments", "analytics", "audit",
] as const;

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch("/api/auth/session", { cache: "no-store", signal: controller.signal }).finally(() => clearTimeout(timeout));
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load account.");
      setSession(result.user ? { user: result.user } : null);
      setProfile(result.profile ?? null);
    } catch {
      setSession(null);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error("Session unavailable");
        if (active) {
          setSession(result.user ? { user: result.user } : null);
          setProfile(result.profile ?? null);
        }
      })
      .catch(() => {
        if (active) { setSession(null); setProfile(null); }
      })
      .finally(() => { clearTimeout(timeout); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, []);

  const signOut = useCallback(async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { setSession(null); setProfile(null); }
  }, []);

  const updateProfilePhoto = useCallback((photoUrl: string | null) => {
    setProfile((current) => current ? { ...current, photo_url: photoUrl } : current);
  }, []);

  const acceptLogin = useCallback((user: UserSession["user"], nextProfile: Profile) => {
    setSession({ user });
    setProfile(nextProfile);
  }, []);

  const value: AuthValue = {
    session, profile, loading,
    isAdmin: profile?.role === "admin" || profile?.role === "super_admin" || profile?.role === "archdeaconry_admin",
    isSuperAdmin: profile?.role === "super_admin",
    canAccess: (section) => {
      if (!profile) return false;
      if (profile.role === "super_admin") return true;
      if (profile.role === "archdeaconry_admin") return section === "my-archdeaconry" || section === "programmes" || (profile.admin_sections ?? []).includes(section);
      if (profile.role === "admin") return (profile.admin_sections ?? []).includes(section);
      return false;
    },
    refreshProfile,
    updateProfilePhoto,
    acceptLogin,
    signOut,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
