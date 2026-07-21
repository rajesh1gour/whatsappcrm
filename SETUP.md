# WhatsApp CRM SaaS — Setup (Step 1)

## 1. Create the Supabase project

1. Go to [database.new](https://database.new) and create a project.
2. Copy from **Project Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. `cp .env.example .env.local` and fill those three in (the Stripe/Meta/OpenAI
   keys are for Steps 3–7 — leave them blank for now).

## 2. Apply the database schema

**Option A — SQL editor (fastest):** open the Supabase Dashboard → SQL Editor,
paste the contents of `supabase/migrations/00000000000001_initial_schema.sql`,
and run it.

**Option B — Supabase CLI (recommended once you're iterating):**

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

## 3. Bootstrap the Super Admin (you)

Sign up once through the app (Step 2) or the Supabase dashboard, then run in
the SQL editor:

```sql
-- Promote yourself; super admins have no tenant
delete from public.tenants
 where id = (select tenant_id from public.users where email = 'you@example.com');

update public.users
   set role = 'super_admin', tenant_id = null
 where email = 'you@example.com';
```

## 4. Generate TypeScript types (after any schema change)

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/lib/database.types.ts
```

## Security model — read this once

| Actor | Key | What they can see |
|---|---|---|
| Browser / client user | `anon` key + user JWT | Only their tenant's rows (RLS) |
| Super admin user | `anon` key + user JWT | Everything except `whatsapp_credentials` |
| Server (webhooks, queue, billing) | `service_role` key | Everything, RLS bypassed |

- `whatsapp_credentials` (Meta access tokens) has RLS enabled with **zero
  policies** — no browser session can ever read tokens, only server code via
  `src/lib/supabase/admin.ts`.
- `messages` and `usage_records` are read-only for clients; only the server
  writes them, so quotas and billing can't be tampered with.
- A trigger on `tenants` blocks clients from editing their own billing/limit
  columns even though they may rename their business.
