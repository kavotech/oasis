"use client";

import { useEffect } from "react";

/** Dashboard quick actions link to a module with ?add=1 - open its Add
 * drawer once the user's write access is known, then drop the param so a
 * refresh doesn't reopen it. (Reads window.location rather than
 * useSearchParams to avoid a Suspense boundary on every module page.) */
export function useOpenOnAddParam(canWrite: boolean, open: () => void) {
  useEffect(() => {
    if (!canWrite || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("add") !== "1") return;
    url.searchParams.delete("add");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canWrite]);
}
