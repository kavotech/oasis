# OASIS mobile

Expo (SDK 57, Expo Router) app for OASIS school management. It talks to the
same Supabase project as the website in the parent folder - same tables, same
RLS, same OTP Edge Functions - and Realtime keeps both in sync.

The UI mirrors the website's portal design (`styles/portal.css`,
`components/portal/ui/*`): oasis lavender `#9498ef`, slate neutrals, 18px
cards. Each module in `src/modules/registry.ts` mirrors its page under
`app/dashboard/*` on the website - same table, fields and role rules.

## Run

```bash
cp .env.example .env   # fill in the website's NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
npm install --legacy-peer-deps
npx expo start
```

Scan the QR code with the iPhone camera (Expo Go). On Windows there is no iOS
simulator; for a standalone iOS build use `npx eas-cli@latest build -p ios`.

## Layout

- `app/` - routes: `(auth)/login`, `(auth)/forgot-password`, `(tabs)/` (Dashboard, Modules, Account), `module/[slug]`
- `src/modules/registry.ts` - every module's tables, fields, list rows and roles
- `src/components/ModuleSection.tsx` - live list + add/edit/delete sheet for one table
- `src/lib/useRealtimeRows.ts` - fetch + Realtime, refetches on reconnect/foreground
- `src/types/database.types.ts` - copied from the website's `types/`; re-copy when the schema changes

`metro.config.js` blocks the website's `node_modules` one level up so only this
app's React is bundled (expo-doctor's "duplicate react" warning is expected).
