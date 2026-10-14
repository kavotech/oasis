"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Sidebar } from "@/components/portal/Sidebar";
import { Topbar } from "@/components/portal/Topbar";
import { schoolNav } from "@/lib/school-nav";
import { FirstRunTutorial } from "@/components/school/FirstRunTutorial";
import { ROLE_LABELS } from "@/lib/auth/roles";

export function SchoolShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, role, loading, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    // super_admin has its own console at /portal - this shell is for the
    // six school-facing roles only.
    if (role === "super_admin") router.replace("/portal/dashboard");
  }, [loading, user, role, router]);

  if (loading || !user || role === "super_admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-oasis-200 border-t-oasis-500" />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen bg-slate-50"
      // Same soft lavender field as the mobile app, so the frosted cards and
      // quick-action buttons have colour to pick up.
      style={{
        backgroundImage:
          "radial-gradient(circle at 8% 0%, rgba(166,169,247,.28), transparent 38%), radial-gradient(circle at 95% 30%, rgba(201,184,255,.22), transparent 36%), linear-gradient(160deg, #f5f4ff, #fbfaff 50%, #f1f2ff)",
        backgroundAttachment: "fixed",
      }}
    >
      <FirstRunTutorial />
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        schoolName={profile?.full_name || user.email || "OASIS"}
        nav={schoolNav}
        onLogout={async () => {
          await signOut();
          router.replace("/login");
        }}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onMobileMenu={() => setMobileOpen(true)}
          username={profile?.full_name || user.email || "Account"}
          searchPlaceholder="Search students, staff..."
          roleLabel={role ? ROLE_LABELS[role] : "Account"}
          profileLinks={[]}
          showNotifications={false}
        />
        <main key={pathname} className="animate-fade-up flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
