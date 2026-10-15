"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WizardFooter, WizardTopBar } from "@/components/onboarding/WizardShell";
import Step1Organisation from "@/components/onboarding/steps/Step1Organisation";
import Step2SchoolType from "@/components/onboarding/steps/Step2SchoolType";
import Step3Location from "@/components/onboarding/steps/Step3Location";
import Step4Profile from "@/components/onboarding/steps/Step4Profile";
import Step5StudentNumbers from "@/components/onboarding/steps/Step5StudentNumbers";
import Step6Staff from "@/components/onboarding/steps/Step6Staff";
import Step7Academic from "@/components/onboarding/steps/Step7Academic";
import Step8CurrentSystems from "@/components/onboarding/steps/Step8CurrentSystems";
import Step9Modules from "@/components/onboarding/steps/Step9Modules";
import Step10Review from "@/components/onboarding/steps/Step10Review";
import { loadApplication, saveApplication } from "@/lib/onboarding-storage";
import type { ModuleKey, OnboardingData, SchoolApplication } from "@/lib/onboarding-types";
import { onboardingSteps } from "@/lib/onboarding-steps";
import { registerSchoolFromApplication } from "@/lib/school-registry";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

type Errors = Record<string, string>;

function validateStep(step: number, data: OnboardingData): Errors {
  const errors: Errors = {};
  const req = (val: string | undefined, key: string, msg = "This field is required.") => {
    if (!val || !val.trim()) errors[key] = msg;
  };

  if (step === 1) {
    const o = data.organisation;
    req(o.companyName, "companyName");
    req(o.schoolName, "schoolName");
    req(o.schoolEmail, "schoolEmail");
    if (o.schoolEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.schoolEmail)) errors.schoolEmail = "Enter a valid email address.";
    req(o.schoolPhone, "schoolPhone");
    req(o.headTeacherName, "headTeacherName");
    req(o.directorName, "directorName");
  } else if (step === 2) {
    if (!data.schoolType.schoolType) errors.schoolType = "Please select a school type.";
  } else if (step === 3) {
    const l = data.location;
    req(l.country, "country");
    req(l.region, "region");
    req(l.district, "district");
    req(l.cityTown, "cityTown");
    req(l.physicalAddress, "physicalAddress");
  } else if (step === 4) {
    const p = data.profile;
    req(p.yearEstablished, "yearEstablished");
    req(p.yearsInOperation, "yearsInOperation");
    req(p.academicCalendar, "academicCalendar");
    req(p.numCampuses, "numCampuses");
    req(p.annualIntake, "annualIntake");
    if (!p.ownership) errors.ownership = "Please select an option.";
    if (!p.boarding) errors.boarding = "Please select an option.";
    if (!p.gender) errors.gender = "Please select an option.";
  } else if (step === 5) {
    if (!data.studentNumbers.currentPopulation) errors.currentPopulation = "Please select your current student population.";
    req(data.studentNumbers.expectedGrowth, "expectedGrowth");
  } else if (step === 6) {
    req(data.staff.teachers, "teachers");
    req(data.staff.adminStaff, "adminStaff");
    req(data.staff.totalEmployees, "totalEmployees");
  } else if (step === 7) {
    if (!data.academic.curriculum) errors.curriculum = "Please select a curriculum.";
    if (data.academic.curriculum === "Other") req(data.academic.otherCurriculum, "otherCurriculum");
    req(data.academic.subjectsOffered, "subjectsOffered");
    req(data.academic.numClasses, "numClasses");
    req(data.academic.numStreams, "numStreams");
    req(data.academic.examinationLevels, "examinationLevels");
  } else if (step === 8) {
    if (!data.currentSystems.currentSystem) errors.currentSystem = "Please select an option.";
    if (data.currentSystems.currentSystem === "existing_software") req(data.currentSystems.currentSoftwareName, "currentSoftwareName");
  } else if (step === 9) {
    if (data.modules.modules.length === 0) errors.modules = "Please select at least one module.";
  }

  return errors;
}

export default function RegisterPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [app, setApp] = useState<SchoolApplication | null>(null);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loaded = loadApplication();
    setApp(loaded);
    setStep(loaded.lastStep || 1);
  }, []);

  const hasLoaded = useRef(false);
  useEffect(() => {
    if (!app) return;
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      return;
    }
    saveApplication({ ...app, lastStep: step });
  }, [step]);

  if (!app) {
    return (
      <div className="wizard-shell" id="main-content">
        <div className="wizard-body">
          <div className="wizard-card" style={{ width: "100%" }}>
            <div className="skeleton" style={{ height: 32, width: "60%", marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 16, width: "90%", marginBottom: 40 }} />
            <div className="skeleton" style={{ height: 200, width: "100%" }} />
          </div>
        </div>
      </div>
    );
  }

  function patch(section: keyof OnboardingData, value: Partial<OnboardingData[keyof OnboardingData]>) {
    setApp((prev) => {
      if (!prev) return prev;
      const next: SchoolApplication = { ...prev, data: { ...prev.data, [section]: { ...prev.data[section], ...value } } };
      setSaving(true);
      saveApplication(next);
      window.setTimeout(() => setSaving(false), 400);
      return next;
    });
  }

  function toggleModule(key: ModuleKey) {
    setApp((prev) => {
      if (!prev) return prev;
      const current = prev.data.modules.modules;
      const nextModules = current.includes(key) ? current.filter((m) => m !== key) : [...current, key];
      const next: SchoolApplication = { ...prev, data: { ...prev.data, modules: { modules: nextModules } } };
      saveApplication(next);
      return next;
    });
  }

  function goNext() {
    if (!app) return;
    const stepErrors = validateStep(step, app.data);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    if (step < onboardingSteps.length) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleSubmit();
    }
  }

  function goBack() {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goToStep(target: number) {
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!app) return;
    setSubmitting(true);

    const submitted: SchoolApplication = { ...app, status: "pending_review", submittedAt: new Date().toISOString() };
    saveApplication(submitted);

    // Real submission - lands in the shared Supabase schools table so it's
    // visible to the mobile app too.
    const supabase = createClient();
    const { org, location, schoolType, studentNumbers } = {
      org: submitted.data.organisation,
      location: submitted.data.location,
      schoolType: submitted.data.schoolType,
      studentNumbers: submitted.data.studentNumbers,
    };
    const fields = {
      name: org.schoolName || "Untitled School",
      district: location.district || null,
      address: [location.physicalAddress, location.cityTown, location.district].filter(Boolean).join(", ") || null,
      contact_name: org.headTeacherName || org.directorName || null,
      contact_email: org.schoolEmail || null,
      contact_phone: org.schoolPhone || null,
      school_type: schoolType.schoolType || null,
      student_band: studentNumbers.currentPopulation || null,
    };

    // The school row already exists (created at signup, linked via
    // profile.school_id) - update it directly now we're authenticated,
    // rather than creating a second row via the anon RPC.
    const { error } = profile?.school_id
      ? await supabase.from("schools").update(fields).eq("id", profile.school_id)
      : await supabase.rpc("submit_school_registration", {
          p_name: fields.name,
          p_district: fields.district ?? undefined,
          p_address: fields.address ?? undefined,
          p_contact_name: fields.contact_name ?? undefined,
          p_contact_email: fields.contact_email ?? undefined,
          p_contact_phone: fields.contact_phone ?? undefined,
          p_school_type: fields.school_type ?? undefined,
          p_student_band: fields.student_band ?? undefined,
        });
    if (error) {
      // Still let the applicant through to the local/admin-console mirror
      // below rather than stranding them on a failed submit - but log this,
      // since it means the shared backend didn't get the record.
      console.error("School registration submit failed:", error.message);
    }

    // Keep the complete application (every wizard step) for the OASIS team -
    // the schools row above only holds the headline fields.
    if (profile?.school_id) {
      const { error: appError } = await supabase.from("school_applications").upsert(
        {
          school_id: profile.school_id,
          submitted_by: profile.id,
          data: submitted.data as unknown as never,
          status: "submitted",
          submitted_at: submitted.submittedAt,
        },
        { onConflict: "school_id" }
      );
      if (appError) console.error("Application save failed:", appError.message);
    }

    // Local mirror the platform-admin console currently reads from
    // (lib/store.ts) - not yet migrated to query Supabase directly.
    registerSchoolFromApplication(submitted);
    // Last step: documents + the school's existing data, then confirmation email.
    router.push(profile?.school_id ? "/register/documents" : "/register/pending");
  }

  return (
    <div className="wizard-shell" id="main-content">
      <WizardTopBar currentStep={step} />
      <div className="wizard-body">
        <div className="wizard-card">
          <div key={step} className="wizard-step-transition">
            {step === 1 && <Step1Organisation data={app.data.organisation} errors={errors} onChange={(p) => patch("organisation", p)} />}
            {step === 2 && (
              <Step2SchoolType value={app.data.schoolType.schoolType} onChange={(v) => patch("schoolType", { schoolType: v })} />
            )}
            {step === 3 && <Step3Location data={app.data.location} errors={errors} onChange={(p) => patch("location", p)} />}
            {step === 4 && <Step4Profile data={app.data.profile} errors={errors} onChange={(p) => patch("profile", p)} />}
            {step === 5 && (
              <Step5StudentNumbers data={app.data.studentNumbers} errors={errors} onChange={(p) => patch("studentNumbers", p)} />
            )}
            {step === 6 && <Step6Staff data={app.data.staff} errors={errors} onChange={(p) => patch("staff", p)} />}
            {step === 7 && <Step7Academic data={app.data.academic} errors={errors} onChange={(p) => patch("academic", p)} />}
            {step === 8 && (
              <Step8CurrentSystems data={app.data.currentSystems} errors={errors} onChange={(p) => patch("currentSystems", p)} />
            )}
            {step === 9 && <Step9Modules selected={app.data.modules.modules} error={errors.modules} onToggle={toggleModule} />}
            {step === 10 && <Step10Review data={app.data} goToStep={goToStep} />}
          </div>
        </div>
      </div>
      <WizardFooter
        onBack={goBack}
        onNext={goNext}
        hideBack={step === 1}
        nextLabel={step === onboardingSteps.length ? (submitting ? "Submitting…" : "Submit application") : "Continue"}
        nextDisabled={submitting}
        saving={saving}
      />
    </div>
  );
}
