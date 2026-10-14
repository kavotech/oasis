/** Turn raw Postgres/PostgREST errors into something a school admin can act
 * on. Unknown messages pass through unchanged. Mirrored in the mobile app
 * (mobile/src/lib/db-errors.ts). */
export function friendlyDbError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("duplicate key")) {
    if (m.includes("attendance_records")) return "This student already has attendance for that date - edit the existing record or use the class register.";
    if (m.includes("admission_number")) return "Another student already has that admission number.";
    return "That record already exists.";
  }
  if (m.includes("row-level security") || m.includes("permission denied")) return "Your role doesn't have permission to do that.";
  if (m.includes("violates check constraint")) return "One of the values isn't allowed - check the options you picked.";
  if (m.includes("violates foreign key")) return m.includes("delete") || m.includes("still referenced") ? "Other records still use this one, so it can't be deleted yet." : "A linked record (student, class…) no longer exists.";
  if (m.includes("violates not-null")) return "A required field is missing.";
  if (m.includes("invalid input syntax")) return "One of the values is in the wrong format.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Couldn't reach the server - check your connection and try again.";
  return message;
}
