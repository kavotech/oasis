// In-memory stand-in for the slice of the supabase-js API the app uses, backed
// by the demo school snapshot. Supports select/insert/update/delete with
// eq/neq/gte/lte/in/order/limit/single, head counts, and postgres_changes
// realtime callbacks so the UI behaves exactly as it does online.
import fixture from "./fixture.json";

type Row = Record<string, unknown> & { id: string };
type Store = Record<string, Row[]>;

export const DEMO_USER_ID = "00000000-0000-4000-8000-000000000d30";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function shiftDates(rows: Row[], days: number): Row[] {
  if (!days) return rows;
  return rows.map((r) => {
    const out: Row = { ...r };
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === "string" && DATE_ONLY.test(v) && k !== "date_of_birth") {
        const d = new Date(`${v}T00:00:00`);
        d.setDate(d.getDate() + days);
        out[k] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }
    }
    return out;
  });
}

function buildStore(): Store {
  const fx = fixture as unknown as Record<string, unknown>;
  // Keep the snapshot "live": move every date forward by however long ago it
  // was taken, so today's attendance and upcoming events stay current.
  const generated = new Date(`${fx.generated as string}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - generated.getTime()) / 86_400_000);
  const store: Store = {};
  for (const [table, rows] of Object.entries(fx)) if (Array.isArray(rows)) store[table] = shiftDates(rows as Row[], days);
  const school = store.schools?.[0];
  store.profiles = [
    {
      id: DEMO_USER_ID,
      school_id: school?.id ?? null,
      role: "school_admin",
      full_name: "Grace Atim",
      email: "demo@oasis.co.ug",
      phone: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_headteacher: true,
      is_form_tutor: false,
      tutor_group: null,
      has_seen_tutorial: true,
      admin_section: null,
    },
  ];
  return store;
}

let store: Store | null = null;
const db = () => (store ??= buildStore());

// Column defaults the real tables apply on insert.
const DEFAULTS: Record<string, Record<string, unknown>> = {
  students: { status: "active" },
  staff: { status: "active" },
  fee_invoices: { status: "unpaid" },
  staff_leave_requests: { status: "pending" },
  admission_applications: { status: "pending" },
  safeguarding_concerns: { status: "open" },
  messages: { audience: "all" },
  assessments: { max_score: 100 },
  trip_consents: { consent_given: false },
  guardians: { is_emergency_contact: false },
  club_members: { joined_at: new Date().toISOString() },
};

type Handler = (payload: { eventType: "INSERT" | "UPDATE" | "DELETE"; new: Row; old: Partial<Row> }) => void;
const listeners = new Map<string, Set<Handler>>();
function emit(table: string, payload: Parameters<Handler>[0]) {
  listeners.get(table)?.forEach((h) => setTimeout(() => h(payload), 0));
}

const uuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

type Filter = (r: Row) => boolean;

class Query implements PromiseLike<{ data: unknown; error: { message: string } | null; count?: number | null }> {
  private op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private conflict: string[] = [];
  private filters: Filter[] = [];
  private sort: { col: string; asc: boolean } | null = null;
  private max: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  private head = false;
  private wantCount = false;
  private payload: unknown = null;

  constructor(private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op === "select") {
      this.wantCount = !!opts?.count;
      this.head = !!opts?.head;
    }
    return this;
  }
  insert(payload: unknown) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  upsert(payload: unknown, opts?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = payload;
    this.conflict = (opts?.onConflict ?? "id").split(",").map((c) => c.trim());
    return this;
  }
  update(payload: unknown) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, v: unknown) {
    this.filters.push((r) => r[col] === v || String(r[col]) === String(v));
    return this;
  }
  neq(col: string, v: unknown) {
    this.filters.push((r) => r[col] !== v);
    return this;
  }
  gte(col: string, v: unknown) {
    this.filters.push((r) => String(r[col] ?? "") >= String(v));
    return this;
  }
  lte(col: string, v: unknown) {
    this.filters.push((r) => String(r[col] ?? "") <= String(v));
    return this;
  }
  in(col: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(r[col]));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.sort = { col, asc: opts?.ascending ?? true };
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }

  private run() {
    const rows = (db()[this.table] ??= []);
    const match = (r: Row) => this.filters.every((f) => f(r));

    if (this.op === "upsert") {
      const items = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Record<string, unknown>[];
      const out: Row[] = [];
      for (const p of items) {
        const i = rows.findIndex((r) => this.conflict.every((c) => r[c] === p[c]));
        if (i >= 0) {
          const old = rows[i];
          rows[i] = { ...old, ...p };
          out.push(rows[i]);
          emit(this.table, { eventType: "UPDATE", new: rows[i], old });
        } else {
          const r = { ...DEFAULTS[this.table], id: uuid(), created_at: new Date().toISOString(), ...p } as Row;
          rows.unshift(r);
          out.push(r);
          emit(this.table, { eventType: "INSERT", new: r, old: {} });
        }
      }
      return this.shape(out);
    }
    if (this.op === "insert") {
      const items = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Record<string, unknown>[];
      const created = items.map((p) => ({ ...DEFAULTS[this.table], id: uuid(), created_at: new Date().toISOString(), ...p }) as Row);
      rows.unshift(...created);
      created.forEach((r) => emit(this.table, { eventType: "INSERT", new: r, old: {} }));
      return this.shape(created);
    }
    if (this.op === "update") {
      const changed: Row[] = [];
      rows.forEach((r, i) => {
        if (!match(r)) return;
        rows[i] = { ...r, ...(this.payload as object), updated_at: new Date().toISOString() };
        changed.push(rows[i]);
        emit(this.table, { eventType: "UPDATE", new: rows[i], old: r });
      });
      return this.shape(changed);
    }
    if (this.op === "delete") {
      const removed = rows.filter(match);
      db()[this.table] = rows.filter((r) => !match(r));
      removed.forEach((r) => emit(this.table, { eventType: "DELETE", new: {} as Row, old: { id: r.id } }));
      return { data: null, error: null };
    }

    let result = rows.filter(match);
    if (this.sort) {
      const { col, asc } = this.sort;
      result = [...result].sort((a, b) => {
        const x = a[col] as string | number | null;
        const y = b[col] as string | number | null;
        if (x === y) return 0;
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        return (x < y ? -1 : 1) * (asc ? 1 : -1);
      });
    }
    const count = result.length;
    if (this.max !== null) result = result.slice(0, this.max);
    if (this.head) return { data: null, error: null, count };
    return { ...this.shape(result), count: this.wantCount ? count : null };
  }

  private shape(rows: Row[]) {
    if (this.mode === "many") return { data: rows.map((r) => ({ ...r })), error: null };
    const first = rows[0] ? { ...rows[0] } : null;
    if (this.mode === "single" && !first) return { data: null, error: { message: "Row not found" } };
    return { data: first, error: null };
  }

  then<A = never, B = never>(onfulfilled?: ((v: ReturnType<Query["run"]>) => A | PromiseLike<A>) | null, onrejected?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return new Promise<ReturnType<Query["run"]>>((resolve) => setTimeout(() => resolve(this.run()), 60)).then(onfulfilled, onrejected);
  }
}

class Channel {
  private subs: { table: string; handler: Handler }[] = [];
  on(_type: string, filter: { table: string }, handler: Handler) {
    this.subs.push({ table: filter.table, handler });
    return this;
  }
  subscribe(cb?: (status: string) => void) {
    for (const s of this.subs) {
      if (!listeners.has(s.table)) listeners.set(s.table, new Set());
      listeners.get(s.table)!.add(s.handler);
    }
    setTimeout(() => cb?.("SUBSCRIBED"), 0);
    return this;
  }
  unsubscribeAll() {
    for (const s of this.subs) listeners.get(s.table)?.delete(s.handler);
  }
}

const session = {
  access_token: "demo",
  refresh_token: "demo",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: DEMO_USER_ID, email: "demo@oasis.co.ug", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};

export const demoClient = {
  from: (table: string) => new Query(table),
  channel: () => new Channel(),
  removeChannel: async (ch: Channel) => {
    ch.unsubscribeAll();
    return "ok";
  },
  auth: {
    getSession: async () => ({ data: { session }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ data: { user: session.user, session }, error: null }),
    signOut: async () => ({ error: null }),
    startAutoRefresh: () => {},
    stopAutoRefresh: () => {},
  },
  functions: {
    invoke: async () => ({ data: null, error: new Error("Not available in the demo.") }),
  },
};
