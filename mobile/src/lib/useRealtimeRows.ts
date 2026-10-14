import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { supabase, type TableName } from "./supabase";

let channelSeq = 0;

/** Live view of a table - the same contract as the website's hook: fetch
 * once, then apply Realtime postgres_changes. RLS scopes rows to the
 * signed-in user's school.
 *
 * Every instance gets its own channel topic (realtime-js returns the
 * existing channel for a repeated topic, which breaks the second
 * subscriber). Realtime doesn't replay events missed while the app was
 * backgrounded or offline, so we refetch on reconnect and whenever the app
 * returns to the foreground. */
export function useRealtimeRows<T extends { id: string }>(table: TableName, orderBy: string = "created_at", enabled = true) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchSeq = useRef(0);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    const seq = ++fetchSeq.current;
    const { data, error } = await supabase.from(table).select("*").order(orderBy, { ascending: false });
    if (seq !== fetchSeq.current) return;
    if (error) setError(error.message);
    else {
      setError(null);
      setRows((data as unknown as T[]) ?? []);
    }
    setLoading(false);
  }, [table, orderBy, enabled]);

  const pullToRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    refetch();

    let subscribedOnce = false;
    const channel = supabase
      .channel(`rows:${table}:${++channelSeq}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        if (!active) return;
        setRows((current) => {
          if (payload.eventType === "INSERT") {
            const next = payload.new as unknown as T;
            return current.some((r) => r.id === next.id) ? current : [next, ...current];
          }
          if (payload.eventType === "UPDATE") {
            const next = payload.new as unknown as T;
            return current.some((r) => r.id === next.id) ? current.map((r) => (r.id === next.id ? next : r)) : [next, ...current];
          }
          if (payload.eventType === "DELETE") {
            const old = payload.old as Partial<T>;
            return current.filter((r) => r.id !== old.id);
          }
          return current;
        });
      })
      .subscribe((status) => {
        if (!active || status !== "SUBSCRIBED") return;
        if (subscribedOnce) refetch();
        subscribedOnce = true;
      });

    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") refetch();
    });

    return () => {
      active = false;
      appState.remove();
      supabase.removeChannel(channel);
    };
  }, [table, refetch, enabled]);

  return { rows, loading, refreshing, error, refetch, pullToRefresh };
}

/** id -> label lookups for relation fields (one fetch per table), refreshed
 * on foreground like the rows themselves. */
export function useLookups(pairs: string[]) {
  const signature = Array.from(new Set(pairs)).sort().join("|");
  const [lookups, setLookups] = useState<Record<string, Map<string, string>>>({});

  const load = useCallback(async () => {
    if (!signature) return;
    const results = await Promise.all(
      signature.split("|").map(async (pair) => {
        const [table, labelKey] = pair.split(".");
        const { data } = await supabase.from(table as TableName).select(`id, ${labelKey}`);
        const entries = ((data ?? []) as unknown as Record<string, unknown>[]).map(
          (r) => [String(r.id), String(r[labelKey] ?? r.id)] as [string, string]
        );
        entries.sort((a, b) => a[1].localeCompare(b[1]));
        return [pair, new Map(entries)] as const;
      })
    );
    setLookups(Object.fromEntries(results));
  }, [signature]);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") load();
    });
    return () => sub.remove();
  }, [load]);

  return { lookups, reloadLookups: load };
}
