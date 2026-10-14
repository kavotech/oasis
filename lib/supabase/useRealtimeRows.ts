"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type TableName = keyof Database["public"]["Tables"] & string;

let channelSeq = 0;

/** Live-updating view of a Postgres table: fetches once, then keeps state in
 * sync via Realtime postgres_changes - no polling. Requires the table to be
 * added to the supabase_realtime publication and readable under the
 * caller's RLS policies.
 *
 * Each hook instance gets its own channel topic. The browser client is a
 * singleton and realtime-js hands back the *existing* channel for a repeated
 * topic, so two components watching the same table under one shared name
 * would throw on the second `.on()` (already subscribed) and the first one
 * to unmount would tear down the other's updates.
 *
 * Changes made while the socket was down (offline, laptop asleep, tab
 * backgrounded) are never replayed by Realtime, so the hook refetches
 * whenever the channel (re)subscribes and when the window regains focus or
 * the network comes back - the mobile app's writes always show up. */
export function useRealtimeRows<T extends { id: string }>(table: TableName, orderBy: keyof T & string = "created_at" as keyof T & string) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchSeq = useRef(0);

  const refetch = useCallback(async () => {
    const seq = ++fetchSeq.current;
    const { data, error } = await supabase.from(table).select("*").order(orderBy, { ascending: false });
    // Drop responses that were overtaken by a newer fetch.
    if (seq !== fetchSeq.current) return;
    if (error) {
      console.error(`useRealtimeRows(${table}):`, error.message);
      setError(error.message);
    } else {
      setError(null);
      setRows((data as unknown as T[]) ?? []);
    }
    setLoading(false);
  }, [supabase, table, orderBy]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    refetch();

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
            const old = payload.old as unknown as Partial<T>;
            return current.filter((r) => r.id !== old.id);
          }
          return current;
        });
      });

    let subscribedOnce = false;
    channel.subscribe((status) => {
      if (!active || status !== "SUBSCRIBED") return;
      // First subscribe is covered by the initial fetch above; later ones
      // are reconnects that may have missed events.
      if (subscribedOnce) refetch();
      subscribedOnce = true;
    });

    const onWake = () => {
      if (document.visibilityState === "visible") refetch();
    };
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    document.addEventListener("visibilitychange", onWake);

    return () => {
      active = false;
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
      supabase.removeChannel(channel);
    };
  }, [supabase, table, refetch]);

  return { rows, loading, error, refetch };
}
