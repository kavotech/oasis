"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ErrorIcon } from "./FormFields";

export type SchoolOption = { id: string; name: string; district: string | null; logo_url: string | null };
/** "My school isn't listed" - a school still under review after sign-up. */
export const UNLISTED_SCHOOL = "__unlisted";
const LAST_SCHOOL_KEY = "oasis.lastSchool";

const BADGE_COLORS = ["#5f61c9", "#0d9488", "#b45309", "#be123c", "#0369a1", "#7c3aed", "#15803d", "#c2410c"];
function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/** A school's logo, or a crest-style monogram (same as the mobile app). */
export function SchoolLogo({ school, size = 36 }: { school: Pick<SchoolOption, "name" | "logo_url">; size?: number }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: size / 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" } as const;
  if (school.logo_url && !failed) {
    return (
      <span style={{ ...box, background: "#fff", border: "1px solid #eef0f5", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={school.logo_url} alt="" width={size * 0.72} height={size * 0.72} style={{ objectFit: "contain" }} onError={() => setFailed(true)} />
      </span>
    );
  }
  const initials = school.name
    .replace(/^(the|st\.?)\s+/i, "")
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !["of", "and", "the"].includes(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  const color = BADGE_COLORS[hash(school.name) % BADGE_COLORS.length];
  return (
    <span style={{ ...box, background: color + "1f", border: `1.5px solid ${color}55`, color, fontWeight: 800, fontSize: size * 0.34 }}>{initials || "?"}</span>
  );
}

/** Approved schools are public, so this works before sign-in. */
export function useSchools() {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    createClient()
      .from("schools")
      .select("id, name, district, logo_url")
      .eq("status", "approved")
      .order("name")
      .then(({ data }) => {
        setSchools(data ?? []);
        setLoading(false);
      });
  }, []);
  return { schools, loading };
}

/** Searchable school dropdown with logos for the auth pages. */
export function SchoolCombobox({
  value,
  onChange,
  error,
  allowUnlisted = false,
}: {
  value: string;
  onChange: (id: string) => void;
  error?: string;
  allowUnlisted?: boolean;
}) {
  const { schools, loading } = useSchools();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Remember the last school picked on this device.
  useEffect(() => {
    if (value || loading) return;
    try {
      const last = window.localStorage.getItem(LAST_SCHOOL_KEY);
      if (last && (schools.some((s) => s.id === last) || (allowUnlisted && last === UNLISTED_SCHOOL))) onChange(last);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const selected = schools.find((s) => s.id === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? schools.filter((s) => s.name.toLowerCase().includes(q) || s.district?.toLowerCase().includes(q)) : schools;
  }, [schools, query]);

  function pick(id: string) {
    onChange(id);
    try {
      window.localStorage.setItem(LAST_SCHOOL_KEY, id);
    } catch {}
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="auth-field" ref={rootRef} style={{ position: "relative" }}>
      <label>
        Your school<span style={{ color: "#e5484d" }}> *</span>
      </label>
      <button
        type="button"
        className={`auth-input${error ? " has-error" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer", minHeight: 52 }}
      >
        {selected ? <SchoolLogo school={selected} size={30} /> : null}
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: selected || value === UNLISTED_SCHOOL ? "#16140c" : "#8a867f" }}>
          {selected?.name ?? (value === UNLISTED_SCHOOL ? "My school isn't listed yet" : loading ? "Loading schools…" : "Select your school…")}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a867f" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {error && (
        <p className="auth-error-text" role="alert">
          <ErrorIcon /> {error}
        </p>
      )}

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 30,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 6,
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(22,20,12,0.1)",
            borderRadius: 14,
            boxShadow: "0 18px 40px -12px rgba(63,65,128,0.35)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 10, borderBottom: "1px solid #f1f2f6" }}>
            <input
              autoFocus
              className="auth-input"
              placeholder={`Search ${schools.length} schools…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ padding: "9px 12px", fontSize: 14 }}
            />
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto", padding: 6 }}>
            {filtered.length === 0 && <p style={{ padding: 16, textAlign: "center", color: "#8a867f", fontSize: 14 }}>No schools match &ldquo;{query}&rdquo;.</p>}
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={s.id === value}
                onClick={() => pick(s.id)}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  border: 0,
                  borderRadius: 10,
                  background: s.id === value ? "rgba(136,140,248,0.14)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = s.id === value ? "rgba(136,140,248,0.2)" : "rgba(22,20,12,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = s.id === value ? "rgba(136,140,248,0.14)" : "transparent")}
              >
                <SchoolLogo school={s} size={32} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, color: "#16140c" }}>{s.name}</span>
                  {s.district && <span style={{ display: "block", fontSize: 12, color: "#8a867f" }}>{s.district}</span>}
                </span>
              </button>
            ))}
            {allowUnlisted && (
              <button
                type="button"
                onClick={() => pick(UNLISTED_SCHOOL)}
                style={{ display: "block", width: "100%", padding: "10px", marginTop: 4, border: 0, borderTop: "1px solid #f1f2f6", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
              >
                <span style={{ display: "block", fontSize: 14, color: "#16140c" }}>My school isn&rsquo;t listed yet</span>
                <span style={{ display: "block", fontSize: 12, color: "#8a867f" }}>Newly registered and still under review</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
