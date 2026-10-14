import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

export type MyClasses = {
  loading: boolean;
  staffId: string | null;
  /** Classes this teacher is class teacher of - their daily register. */
  formClassIds: string[];
  /** Every class they're responsible for (class teacher, tutor, or subject). */
  classIds: string[];
};

/** The signed-in teacher's classes, from the same my_class_ids() function the
 * database uses to decide who may mark attendance. */
export function useMyClasses(): MyClasses {
  const { role, user } = useAuth();
  const [state, setState] = useState<MyClasses>({ loading: true, staffId: null, formClassIds: [], classIds: [] });

  useEffect(() => {
    if (!user || role === "school_admin") {
      setState({ loading: false, staffId: null, formClassIds: [], classIds: [] });
      return;
    }
    let active = true;
    (async () => {
      const [{ data: staffId }, { data: ids }] = await Promise.all([supabase.rpc("my_staff_id"), supabase.rpc("my_class_ids")]);
      let form: string[] = [];
      if (staffId) {
        const { data } = await supabase.from("classes").select("id").eq("class_teacher_id", staffId as string);
        form = ((data as { id: string }[]) ?? []).map((c) => c.id);
      }
      if (active) setState({ loading: false, staffId: (staffId as string) ?? null, formClassIds: form, classIds: ((ids as string[]) ?? []).filter(Boolean) });
    })();
    return () => {
      active = false;
    };
  }, [role, user]);

  return state;
}
