"use client";

import { useState, type FormEvent } from "react";
import { Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { useOpenOnAddParam } from "@/hooks/useOpenOnAddParam";
import { Card } from "@/components/portal/ui/Card";
import { Table, type Column } from "@/components/portal/ui/Table";
import { Button } from "@/components/portal/ui/Button";
import { Drawer } from "@/components/portal/ui/Drawer";
import { Input } from "@/components/portal/ui/Input";
import { Badge } from "@/components/portal/ui/Badge";
import { Field, textareaClassName } from "@/components/school/Field";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useRealtimeRows } from "@/lib/supabase/useRealtimeRows";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/useToast";
import type { Tables } from "@/types/database.types";

type Event = Tables<"calendar_events">;

export default function CalendarPage() {
  const { profile, role } = useAuth();
  const { toast } = useToast();
  const { rows, loading } = useRealtimeRows<Event>("calendar_events", "event_date");
  const canWrite = role === "school_admin" || role === "teacher" || role === "bursar";
  const canDelete = role === "school_admin";

  const [open, setOpen] = useState(false);
  useOpenOnAddParam(canWrite, () => setOpen(true));
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile?.school_id || !title.trim() || !eventDate) return;
    setSaving(true);
    const { error } = await createClient().from("calendar_events").insert({
      school_id: profile.school_id,
      title: title.trim(),
      description: description.trim() || null,
      event_date: eventDate,
      event_type: eventType.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast("error", "Couldn't add event", error.message);
      return;
    }
    setOpen(false);
    setTitle("");
    setDescription("");
    setEventDate("");
    setEventType("");
    toast("success", "Event added", "");
  }

  async function handleDelete(id: string) {
    const { error } = await createClient().from("calendar_events").delete().eq("id", id);
    if (error) toast("error", "Couldn't delete event", error.message);
  }

  const columns: Column<Event>[] = [
    { key: "title", header: "Event", render: (r) => <p className="font-medium text-slate-800">{r.title}</p> },
    { key: "date", header: "Date", render: (r) => r.event_date },
    { key: "type", header: "Type", render: (r) => (r.event_type ? <Badge tone="info">{r.event_type}</Badge> : "—") },
    { key: "description", header: "Description", render: (r) => r.description || "—" },
    ...(canDelete
      ? [
          {
            key: "actions",
            header: "",
            render: (r: Event) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(r.id);
                }}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                aria-label="Delete event"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="School calendar, events, exams, trips, parents evenings, staff meetings, holidays."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Calendar" }]}
        action={
          canWrite && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add event
            </Button>
          )
        }
      />

      <Card className="p-0">
        <Table
          columns={columns}
          rows={rows}
          loading={loading}
          emptyTitle="No events yet"
          emptyDescription="Events added here show up live in the mobile app too."
        />
      </Card>

      <Drawer open={open} onClose={() => setOpen(false)} title="Add calendar event" width={480}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          <Field label="Date">
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
          </Field>
          <Field label="Type">
            <Input placeholder="e.g. Exam, Trip, Holiday" value={eventType} onChange={(e) => setEventType(e.target.value)} />
          </Field>
          <Field label="Description">
            <textarea className={textareaClassName} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Add event"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
