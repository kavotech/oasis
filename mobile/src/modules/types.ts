import type { Tone } from "@/theme";
import type { IconName } from "@/components/ui";
import type { TableName } from "@/lib/supabase";

export type Row = { id: string; [key: string]: unknown };

type FieldBase = {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  /** Only shown when editing an existing row (e.g. approving a request). */
  editOnly?: boolean;
  /** Restrict who sees/sets this field; defaults to everyone with write access. */
  roles?: string[];
  /** Collected in the form but not written to the table - handled by afterSave. */
  virtual?: boolean;
};

export type FieldDef = FieldBase &
  (
    | { type: "text" | "email" | "phone" | "date" | "number" | "time" | "textarea" }
    | { type: "select"; options: { value: string; label: string }[] }
    | { type: "boolean-select"; trueLabel: string; falseLabel: string }
    | { type: "relation"; relationTable: TableName; labelKey: string }
  );

/** Resolve a relation field on a row to its label, e.g. rel("student_id"). */
export type Rel = (fieldKey: string) => string | null;

export type SaveContext = {
  schoolId: string;
  isEdit: boolean;
  values: Record<string, string>;
  labelFor: (fieldKey: string, id: string) => string | null;
};

export type SectionDef = {
  table: TableName;
  title: string;
  fields: FieldDef[];
  writeRoles: string[];
  deleteRoles?: string[];
  readRoles?: string[];
  orderBy?: string;
  searchable?: boolean;
  item: {
    title: (r: Row, rel: Rel) => string;
    subtitle?: (r: Row, rel: Rel) => string | null | undefined;
    meta?: (r: Row, rel: Rel) => string | null | undefined;
    badge?: (r: Row) => { label: string; tone: Tone } | null;
    avatar?: boolean;
  };
  /** Adjust the payload before insert/update (e.g. denormalised names). */
  transform?: (payload: Record<string, unknown>, ctx: SaveContext) => Record<string, unknown>;
  /** Runs after a successful insert/update with the saved row id. */
  afterSave?: (id: string, ctx: SaveContext) => Promise<string | null>;
  /** Insert as an upsert on these columns (e.g. one attendance mark per
   * student per day) so re-adding edits instead of failing. */
  upsertOn?: string;
  /** Extra shortcuts shown beside Add, e.g. bulk tools. */
  actions?: { label: string; icon: IconName; href: string }[];
};

export type ModuleDef =
  | { slug: string; label: string; icon: IconName; description: string; kind: "crud"; sections: SectionDef[] }
  | { slug: string; label: string; icon: IconName; description: string; kind: "screen" };
