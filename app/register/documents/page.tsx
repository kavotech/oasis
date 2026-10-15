"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthLogo } from "@/components/auth/AuthLogo";
import { documentRequirements, type DocumentKey } from "@/lib/onboarding-types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { formatBytes, uploadSchoolFile } from "@/lib/school-uploads";
import type { Tables } from "@/types/database.types";

type FileRow = Tables<"school_files">;

/** Final onboarding step: real uploads of the registration documents plus any
 * school data (files or whole folders) the school wants on its dashboards.
 * Submitting emails the school a confirmation and alerts OASIS developers. */
export default function DocumentUploadPage() {
  const router = useRouter();
  const { profile, loading } = useAuth();
  const schoolId = profile?.school_id ?? null;
  const [rows, setRows] = useState<FileRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const folderInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);

  async function refresh() {
    if (!schoolId) return;
    const { data } = await createClient().from("school_files").select("*").eq("school_id", schoolId).order("created_at", { ascending: false });
    setRows(data ?? []);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const docFor = (key: DocumentKey) => rows.find((r) => r.category === "document" && r.note === key);
  const dataRows = rows.filter((r) => r.category === "data");
  const requiredKeys = documentRequirements.filter((d) => d.required).map((d) => d.key);
  const allRequiredUploaded = requiredKeys.every((k) => docFor(k));

  async function uploadDoc(key: DocumentKey, file: File) {
    if (!schoolId) return;
    setBusy(key);
    setError(null);
    const { error } = await uploadSchoolFile(schoolId, file, "document", { note: key });
    setBusy(null);
    if (error) setError(`Couldn't upload ${file.name}: ${error}`);
    refresh();
  }

  async function uploadData(list: FileList | File[]) {
    if (!schoolId) return;
    const files = Array.from(list).filter((f) => f.size > 0 && !f.name.startsWith("."));
    if (!files.length) return;
    setError(null);
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i] as File & { webkitRelativePath?: string };
      setBusy(`Uploading ${i + 1} of ${files.length}: ${f.name}`);
      const { error } = await uploadSchoolFile(schoolId, f, "data", { relativePath: f.webkitRelativePath || f.name, note: note.trim() || undefined });
      if (error) failed++;
    }
    setBusy(null);
    if (failed) setError(`${failed} file(s) couldn't be uploaded (max 50 MB each). Try them again.`);
    refresh();
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const { error } = await createClient().functions.invoke("registration-received", { body: {} });
    setSubmitting(false);
    if (error) {
      // The application and files are saved either way; the email is a courtesy.
      console.error("registration-received failed", error);
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="auth-shell" id="main-content" style={{ gridTemplateColumns: "1fr" }}>
        <div className="auth-form-col">
          <div className="auth-card" style={{ maxWidth: 480, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#eaf7ee", color: "#1e7b34", display: "grid", placeContent: "center", margin: "0 auto 24px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <h1>Request received</h1>
            <p className="auth-subtitle">
              Thank you - OASIS has received your registration{rows.length ? ` and ${rows.length} file(s)` : ""}. We&rsquo;ve emailed you a confirmation and our team will review
              it shortly, usually within one working day.
            </p>
            <button type="button" className="auth-btn auth-btn-primary" onClick={() => router.push("/register/pending")}>
              Check application status
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && !schoolId) {
    return (
      <div className="auth-shell" id="main-content" style={{ gridTemplateColumns: "1fr" }}>
        <div className="auth-form-col">
          <div className="auth-card" style={{ maxWidth: 480, textAlign: "center" }}>
            <h1>Sign in to continue</h1>
            <p className="auth-subtitle">Sign in with the account you registered your school with to upload documents.</p>
            <button type="button" className="auth-btn auth-btn-primary" onClick={() => router.push("/login")}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-shell" id="main-content">
      <div className="wizard-topbar-wrap">
        <div className="wizard-topbar">
          <AuthLogo />
          <span className="status-badge pending">Almost done</span>
        </div>
      </div>
      <div className="wizard-body">
        <div className="wizard-card">
          <div className="wizard-step-panel">
            <div className="wizard-step-header">
              <p className="wizard-step-eyebrow">Final step</p>
              <h1 className="wizard-step-title">Documents &amp; your school&rsquo;s data</h1>
              <p className="wizard-step-desc">
                Upload your registration documents, then share any existing records - student lists, parents and guardians, staff, fees - so they&rsquo;re on your
                dashboards from day one. Everything is stored privately and only your school and the OASIS team can see it.
              </p>
            </div>

            {error && (
              <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: 16 }}>
                <span>{error}</span>
              </div>
            )}

            <h2 style={{ fontSize: 17, margin: "8px 0 12px" }}>1. Registration documents</h2>
            <div style={{ display: "grid", gap: 14 }}>
              {documentRequirements.map((doc) => {
                const uploaded = docFor(doc.key);
                return (
                  <div key={doc.key}>
                    <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 14 }}>
                      {doc.label} {doc.required ? <span style={{ color: "#e5484d" }}>*</span> : <span style={{ color: "#8a867f", fontWeight: 400 }}>(optional)</span>}
                    </p>
                    <p style={{ margin: "0 0 8px", fontSize: 13, color: "#635f56" }}>{doc.description}</p>
                    <label
                      className={`wizard-upload-zone${uploaded ? " has-file" : ""}${dragOver === doc.key ? " is-dragover" : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(doc.key);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e: DragEvent<HTMLLabelElement>) => {
                        e.preventDefault();
                        setDragOver(null);
                        const f = e.dataTransfer.files?.[0];
                        if (f) uploadDoc(doc.key, f);
                      }}
                    >
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadDoc(doc.key, f);
                          e.target.value = "";
                        }}
                      />
                      {busy === doc.key ? (
                        <span>Uploading…</span>
                      ) : uploaded ? (
                        <span>
                          &#10003; {uploaded.name} ({formatBytes(uploaded.size_bytes)}) &mdash; click to replace
                        </span>
                      ) : (
                        <span>
                          Drag and drop a file here, or <span style={{ color: "#888cf8", fontWeight: 600 }}>browse</span>
                        </span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>

            <h2 style={{ fontSize: 17, margin: "28px 0 6px" }}>2. Your school&rsquo;s data (optional, recommended)</h2>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#635f56" }}>
              Excel or CSV exports, PDFs or a whole folder. Ideal: one sheet of students with their class and parent details - a parent with several
              children can simply appear on each child&rsquo;s row; we link them together automatically.
            </p>
            <textarea
              className="auth-input"
              rows={2}
              placeholder="Anything we should know about these files? (e.g. 'Students.xlsx has all P1-P7; fees are in the Finance folder')"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <label
              className={`wizard-upload-zone${dragOver === "data" ? " is-dragover" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver("data");
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                uploadData(e.dataTransfer.files);
              }}
              onClick={(e) => {
                e.preventDefault();
                filesInput.current?.click();
              }}
            >
              {busy && !documentRequirements.some((d) => d.key === busy) ? (
                <span>{busy}</span>
              ) : (
                <span>
                  Drag files here, <span style={{ color: "#888cf8", fontWeight: 600 }}>choose files</span>, or{" "}
                  <span
                    role="button"
                    tabIndex={0}
                    style={{ color: "#888cf8", fontWeight: 600, textDecoration: "underline" }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      folderInput.current?.click();
                    }}
                  >
                    upload a whole folder
                  </span>
                </span>
              )}
            </label>
            <input ref={filesInput} type="file" multiple style={{ display: "none" }} onChange={(e) => e.target.files && uploadData(e.target.files)} />
            <input
              ref={folderInput}
              type="file"
              multiple
              style={{ display: "none" }}
              // Folder picking (Chrome, Edge, Safari, Firefox).
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              onChange={(e) => e.target.files && uploadData(e.target.files)}
            />
            {dataRows.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", fontSize: 13 }}>
                {dataRows.map((r) => (
                  <li key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f2f6" }}>
                    <span>&#128196; {r.name}</span>
                    <span style={{ color: "#8a867f" }}>{formatBytes(r.size_bytes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <div className="wizard-footer">
        <div className="wizard-footer-inner">
          <span className="auth-hint-text">
            {requiredKeys.filter((k) => docFor(k)).length} of {requiredKeys.length} required documents · {dataRows.length} data file(s)
          </span>
          <button type="button" className="wizard-btn wizard-btn-primary" onClick={handleSubmit} disabled={!allRequiredUploaded || submitting || !!busy}>
            {submitting ? "Submitting…" : "Submit to OASIS"}
          </button>
        </div>
      </div>
    </div>
  );
}
