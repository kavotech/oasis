import { useState } from "react";
import { Alert, Linking, View } from "react-native";
import { Text } from "@/components/Text";
import { ListRow, PlatformScreen } from "@/components/PlatformScreen";
import { Badge, Button, Card, ErrorBanner, Field, Input, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useRealtimeRows } from "@/lib/useRealtimeRows";
import { EMAIL_RE, platformAction } from "@/lib/platform";
import type { Tables } from "@/types/database.types";
import { colors } from "@/theme";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const PROJECT_REF = SUPABASE_URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? "";

/** The OASIS developer allow-list (who controls the platform) and the
 * public connection keys. Secret keys are never shown in the app. */
export default function Developers() {
  const { user } = useAuth();
  const devs = useRealtimeRows<Tables<"platform_developers">>("platform_developers");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return setError("Enter a valid email.");
    setSaving(true);
    const { error } = await supabase.from("platform_developers").insert({ email: e, full_name: name.trim() || null, invited_by: user?.id ?? null });
    setSaving(false);
    if (error) return setError(error.message.includes("duplicate") ? "That email is already on the list." : error.message);
    setEmail("");
    setName("");
    devs.refetch();
    Alert.alert("Developer added", `${e} can now create a developer login: Sign in → "OASIS team" in the app, or "Join as an OASIS developer" on the website.`);
  }

  function toggle(d: Tables<"platform_developers">) {
    const revoke = !d.revoked_at;
    const run = async () => {
      setBusy(d.id);
      if (d.profile_id) {
        const { error } = await platformAction({ action: "set_user_access", user_id: d.profile_id, revoked: revoke });
        if (error) {
          setBusy(null);
          return Alert.alert("Couldn't change access", error);
        }
      } else {
        await supabase.from("platform_developers").update({ revoked_at: revoke ? new Date().toISOString() : null }).eq("id", d.id);
      }
      setBusy(null);
      devs.refetch();
    };
    if (!revoke) return run();
    if (d.profile_id === user?.id) return Alert.alert("That's you", "Ask another developer to remove your access.");
    Alert.alert("Remove developer access?", `${d.email} will be signed out of the OASIS console.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: run },
    ]);
  }

  const sorted = [...devs.rows].sort((a, b) => Number(!!a.revoked_at) - Number(!!b.revoked_at) || a.email.localeCompare(b.email));

  return (
    <PlatformScreen title="Developers & keys" description="Developers control OASIS: they approve schools, manage admins and see every request.">
      <Card>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.slate900, marginBottom: 12 }}>Add a developer</Text>
        {error && <ErrorBanner message={error} />}
        <Field label="Name">
          <Input value={name} onChangeText={setName} autoCapitalize="words" />
        </Field>
        <Field label="Email" hint="They create their own login with this email - you never set their password.">
          <Input value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        </Field>
        <Button icon="user-plus" loading={saving} onPress={add}>
          Add developer
        </Button>
      </Card>

      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.slate900, marginTop: 20, marginBottom: 8 }}>OASIS developers</Text>
      {devs.loading ? (
        <Spinner />
      ) : (
        <Card padded={false}>
          {sorted.map((d, i) => (
            <ListRow key={d.id} first={i === 0}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: d.revoked_at ? colors.slate400 : colors.slate800 }}>{d.full_name ?? d.email}</Text>
                <Text style={{ fontSize: 12, color: colors.slate500, marginTop: 1 }} numberOfLines={1}>
                  {d.email}
                </Text>
                <View style={{ flexDirection: "row", marginTop: 5 }}>
                  {d.revoked_at ? <Badge tone="danger">Access removed</Badge> : d.profile_id ? <Badge tone="success">Active</Badge> : <Badge tone="warning">Invited</Badge>}
                </View>
              </View>
              <Button size="sm" variant={d.revoked_at ? "secondary" : "danger"} loading={busy === d.id} onPress={() => toggle(d)}>
                {d.revoked_at ? "Restore" : "Remove"}
              </Button>
            </ListRow>
          ))}
        </Card>
      )}

      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.slate900, marginTop: 20, marginBottom: 8 }}>Keys</Text>
      <Card>
        <KeyRow label="Supabase URL" value={SUPABASE_URL} />
        <KeyRow label="Publishable key" value={PUBLISHABLE_KEY} />
        <KeyRow label="Project ref" value={PROJECT_REF} />
        <Text style={{ fontSize: 12.5, color: colors.slate500, lineHeight: 18, marginTop: 8 }}>
          Public keys are safe in apps - row-level security protects the data. The service-role key, Resend key and database password stay in
          Supabase / Vercel secrets and are never shown here. Long-press a value to copy it.
        </Text>
        <Button
          variant="secondary"
          icon="external-link"
          style={{ marginTop: 12 }}
          onPress={() => Linking.openURL(PROJECT_REF ? `https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api-keys` : "https://supabase.com/dashboard")}
        >
          Open Supabase dashboard
        </Button>
      </Card>
    </PlatformScreen>
  );
}

function KeyRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: "rgba(100,104,180,0.2)" }}>
      <Text style={{ fontSize: 12, color: colors.slate500 }}>{label}</Text>
      <Text selectable numberOfLines={2} style={{ fontSize: 13, color: colors.slate800, fontFamily: "Courier", marginTop: 2 }}>
        {value || "—"}
      </Text>
    </View>
  );
}
