-- =============================================================================
-- WhatsApp CRM SaaS — Initial Schema
-- Multi-tenant with Row Level Security.
--
-- Roles model:
--   * 'client'      — belongs to a tenant, sees only that tenant's rows
--   * 'super_admin' — the SaaS owner, sees everything
-- The Supabase service_role key (server-side only) bypasses RLS entirely and
-- is used by webhooks, queues, and billing jobs.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type user_role as enum ('client', 'super_admin');
create type subscription_tier as enum ('basic', 'standard', 'premium');
create type tenant_status as enum ('active', 'suspended', 'cancelled');
create type contact_opt_in as enum ('opted_in', 'opted_out', 'unknown');
create type campaign_status as enum ('draft', 'scheduled', 'queued', 'sending', 'completed', 'failed', 'cancelled');
create type message_direction as enum ('inbound', 'outbound');
create type message_status as enum ('queued', 'sent', 'delivered', 'read', 'failed');
create type template_status as enum ('draft', 'pending_review', 'submitted_to_meta', 'approved', 'rejected', 'paused');
create type template_category as enum ('marketing', 'utility', 'authentication');
create type waba_connection_status as enum ('disconnected', 'pending', 'connected', 'error');
create type conversation_mode as enum ('ai', 'human', 'closed');

-- ---------------------------------------------------------------------------
-- TENANTS — one row per paying client business
-- ---------------------------------------------------------------------------
create table public.tenants (
    id                   uuid primary key default gen_random_uuid(),
    name                 text not null,
    status               tenant_status not null default 'active',
    -- Stripe
    stripe_customer_id   text unique,
    stripe_subscription_id text unique,
    subscription_tier    subscription_tier,          -- null until they subscribe
    subscription_current_period_end timestamptz,
    -- Plan limits & usage (message_count resets each billing period)
    monthly_message_limit integer not null default 0,
    message_count        integer not null default 0,
    usage_period_start   timestamptz not null default now(),
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- USERS — profile rows, 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table public.users (
    id         uuid primary key references auth.users (id) on delete cascade,
    tenant_id  uuid references public.tenants (id) on delete cascade,
    role       user_role not null default 'client',
    email      text not null,
    full_name  text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- super admins float above tenants; clients must belong to one
    constraint users_tenant_check check (
        (role = 'super_admin' and tenant_id is null)
        or (role = 'client' and tenant_id is not null)
    )
);

create index users_tenant_id_idx on public.users (tenant_id);

-- ---------------------------------------------------------------------------
-- RLS HELPER FUNCTIONS
-- SECURITY DEFINER so policies can read public.users without recursing
-- through that table's own RLS policies.
-- ---------------------------------------------------------------------------
create or replace function public.get_tenant_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
    select tenant_id from public.users where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1 from public.users
        where id = auth.uid() and role = 'super_admin'
    );
$$;

-- Lock the helpers down to authenticated callers only.
revoke execute on function public.get_tenant_id() from anon, public;
revoke execute on function public.is_super_admin() from anon, public;
grant execute on function public.get_tenant_id() to authenticated;
grant execute on function public.is_super_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- WHATSAPP CONNECTIONS — one WABA per tenant (Embedded Signup result)
-- NOTE: no access token here. Tokens live in whatsapp_credentials, which has
-- RLS enabled and NO policies => only service_role can read/write them.
-- ---------------------------------------------------------------------------
create table public.whatsapp_connections (
    id                   uuid primary key default gen_random_uuid(),
    tenant_id            uuid not null references public.tenants (id) on delete cascade,
    waba_id              text not null,               -- WhatsApp Business Account ID
    phone_number_id      text not null,               -- Meta phone number ID (used to send)
    display_phone_number text,
    verified_name        text,
    quality_rating       text,                        -- GREEN / YELLOW / RED from Meta
    status               waba_connection_status not null default 'pending',
    connected_at         timestamptz,
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now(),
    unique (tenant_id),                               -- one number per tenant for now
    unique (phone_number_id)
);

create table public.whatsapp_credentials (
    connection_id  uuid primary key references public.whatsapp_connections (id) on delete cascade,
    access_token   text not null,                     -- long-lived system-user token from token exchange
    token_expires_at timestamptz,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CONTACTS
-- ---------------------------------------------------------------------------
create table public.contacts (
    id            uuid primary key default gen_random_uuid(),
    tenant_id     uuid not null references public.tenants (id) on delete cascade,
    phone_number  text not null,                      -- E.164, e.g. +14155552671
    name          text,
    tags          text[] not null default '{}',
    opt_in_status contact_opt_in not null default 'unknown',
    opt_in_at     timestamptz,
    attributes    jsonb not null default '{}',        -- arbitrary CSV columns land here
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    unique (tenant_id, phone_number),
    constraint contacts_phone_e164 check (phone_number ~ '^\+[1-9][0-9]{6,14}$')
);

create index contacts_tenant_id_idx on public.contacts (tenant_id);
create index contacts_tags_idx on public.contacts using gin (tags);

-- ---------------------------------------------------------------------------
-- WHATSAPP TEMPLATES
-- ---------------------------------------------------------------------------
create table public.whatsapp_templates (
    id               uuid primary key default gen_random_uuid(),
    tenant_id        uuid not null references public.tenants (id) on delete cascade,
    name             text not null,                   -- meta template name (snake_case)
    language         text not null default 'en',
    category         template_category not null default 'marketing',
    status           template_status not null default 'draft',
    header_type      text,                            -- TEXT | IMAGE | VIDEO | DOCUMENT | null
    header_text      text,
    body             text not null,                   -- with {{1}} {{2}} placeholders
    footer           text,
    buttons          jsonb not null default '[]',
    meta_template_id text,                            -- id returned by Meta after submission
    rejection_reason text,
    -- super-admin moderation gate before anything goes to Meta
    moderated_by     uuid references public.users (id),
    moderated_at     timestamptz,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    unique (tenant_id, name, language)
);

create index whatsapp_templates_tenant_id_idx on public.whatsapp_templates (tenant_id);

-- ---------------------------------------------------------------------------
-- CAMPAIGNS
-- ---------------------------------------------------------------------------
create table public.campaigns (
    id              uuid primary key default gen_random_uuid(),
    tenant_id       uuid not null references public.tenants (id) on delete cascade,
    template_id     uuid not null references public.whatsapp_templates (id),
    name            text not null,
    status          campaign_status not null default 'draft',
    target_tags     text[] not null default '{}',     -- audience = contacts with any of these tags
    audience_size   integer not null default 0,
    scheduled_at    timestamptz,
    started_at      timestamptz,
    completed_at    timestamptz,
    -- denormalized analytics counters (updated by webhook status events)
    sent_count      integer not null default 0,
    delivered_count integer not null default 0,
    read_count      integer not null default 0,
    clicked_count   integer not null default 0,
    failed_count    integer not null default 0,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index campaigns_tenant_id_idx on public.campaigns (tenant_id);

-- ---------------------------------------------------------------------------
-- CONVERSATIONS — inbox thread per contact; drives AI vs human handoff
-- ---------------------------------------------------------------------------
create table public.conversations (
    id                   uuid primary key default gen_random_uuid(),
    tenant_id            uuid not null references public.tenants (id) on delete cascade,
    contact_id           uuid not null references public.contacts (id) on delete cascade,
    mode                 conversation_mode not null default 'ai',
    last_message_at      timestamptz,
    -- Meta's 24h customer-service window: free-form replies allowed until this
    service_window_expires_at timestamptz,
    unread_count         integer not null default 0,
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now(),
    unique (tenant_id, contact_id)
);

create index conversations_tenant_id_idx on public.conversations (tenant_id);

-- ---------------------------------------------------------------------------
-- MESSAGES
-- ---------------------------------------------------------------------------
create table public.messages (
    id               uuid primary key default gen_random_uuid(),
    tenant_id        uuid not null references public.tenants (id) on delete cascade,
    contact_id       uuid not null references public.contacts (id) on delete cascade,
    conversation_id  uuid references public.conversations (id) on delete set null,
    campaign_id      uuid references public.campaigns (id) on delete set null,
    direction        message_direction not null,
    status           message_status not null default 'queued',
    body             text,
    message_type     text not null default 'text',    -- text | template | image | ...
    wamid            text unique,                     -- Meta message id, for status webhooks
    error_code       text,
    error_message    text,
    sent_by_ai       boolean not null default false,
    created_at       timestamptz not null default now(),
    status_updated_at timestamptz
);

create index messages_tenant_id_idx on public.messages (tenant_id);
create index messages_contact_id_idx on public.messages (contact_id);
create index messages_campaign_id_idx on public.messages (campaign_id) where campaign_id is not null;
create index messages_conversation_created_idx on public.messages (conversation_id, created_at desc);

-- ---------------------------------------------------------------------------
-- CHATBOT CONFIG — per-tenant AI settings
-- ---------------------------------------------------------------------------
create table public.chatbot_configs (
    tenant_id          uuid primary key references public.tenants (id) on delete cascade,
    enabled            boolean not null default false,
    business_description text,                        -- becomes part of system prompt
    tone               text not null default 'friendly',
    handoff_keywords   text[] not null default '{"human","agent","support"}',
    max_ai_replies_per_conversation integer not null default 10,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- USAGE RECORDS — source of truth for metered billing & profitability
-- One row per billable event, written only by the server (service_role).
-- ---------------------------------------------------------------------------
create table public.usage_records (
    id           uuid primary key default gen_random_uuid(),
    tenant_id    uuid not null references public.tenants (id) on delete cascade,
    message_id   uuid references public.messages (id) on delete set null,
    kind         text not null,                       -- 'wa_marketing' | 'wa_utility' | 'wa_service' | 'openai_tokens'
    quantity     numeric not null default 1,          -- messages, or token count for openai
    -- what Meta/OpenAI charges US (owner cost) vs what we bill the tenant
    unit_cost_usd    numeric(10,6) not null default 0,
    unit_price_usd   numeric(10,6) not null default 0,
    reported_to_stripe boolean not null default false,
    created_at   timestamptz not null default now()
);

create index usage_records_tenant_period_idx on public.usage_records (tenant_id, created_at);
create index usage_records_unreported_idx on public.usage_records (reported_to_stripe) where reported_to_stripe = false;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

do $$
declare t text;
begin
    foreach t in array array[
        'tenants','users','whatsapp_connections','whatsapp_credentials',
        'contacts','whatsapp_templates','campaigns','conversations','chatbot_configs'
    ] loop
        execute format(
            'create trigger set_updated_at before update on public.%I
             for each row execute function public.set_updated_at()', t);
    end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- AUTO-PROVISION: when a user signs up via Supabase Auth, create their
-- tenant + profile row. Company name is passed as signup metadata.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    new_tenant_id uuid;
begin
    insert into public.tenants (name)
    values (coalesce(new.raw_user_meta_data ->> 'company_name', 'My Business'))
    returning id into new_tenant_id;

    insert into public.users (id, tenant_id, role, email, full_name)
    values (
        new.id,
        new_tenant_id,
        'client',
        new.email,
        new.raw_user_meta_data ->> 'full_name'
    );

    insert into public.chatbot_configs (tenant_id) values (new_tenant_id);

    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.tenants              enable row level security;
alter table public.users                enable row level security;
alter table public.whatsapp_connections enable row level security;
alter table public.whatsapp_credentials enable row level security;  -- no policies: service_role only
alter table public.contacts             enable row level security;
alter table public.whatsapp_templates   enable row level security;
alter table public.campaigns            enable row level security;
alter table public.conversations        enable row level security;
alter table public.messages             enable row level security;
alter table public.chatbot_configs      enable row level security;
alter table public.usage_records        enable row level security;

-- ---- tenants ----------------------------------------------------------------
create policy "clients read own tenant" on public.tenants
    for select to authenticated
    using (id = (select public.get_tenant_id()) or (select public.is_super_admin()));

create policy "clients update own tenant name" on public.tenants
    for update to authenticated
    using (id = (select public.get_tenant_id()))
    with check (id = (select public.get_tenant_id()));
-- (tier/limits/stripe fields are changed only by the server via service_role;
--  column-level protection is enforced by a trigger below)

create policy "super admin full access tenants" on public.tenants
    for all to authenticated
    using ((select public.is_super_admin()))
    with check ((select public.is_super_admin()));

-- Prevent clients from self-upgrading billing columns even though they can
-- update their tenant row (Postgres RLS is row-level, not column-level).
create or replace function public.protect_tenant_billing_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    -- auth.uid() is null for service_role and direct SQL — those are trusted.
    if auth.uid() is null or (select public.is_super_admin()) then
        return new;
    end if;
    -- clients may only change the name
    new.status := old.status;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.subscription_tier := old.subscription_tier;
    new.subscription_current_period_end := old.subscription_current_period_end;
    new.monthly_message_limit := old.monthly_message_limit;
    new.message_count := old.message_count;
    new.usage_period_start := old.usage_period_start;
    return new;
end;
$$;

create trigger protect_tenant_billing before update on public.tenants
    for each row execute function public.protect_tenant_billing_columns();

-- ---- users ------------------------------------------------------------------
create policy "read own profile or same tenant" on public.users
    for select to authenticated
    using (
        id = auth.uid()
        or tenant_id = (select public.get_tenant_id())
        or (select public.is_super_admin())
    );

create policy "update own profile" on public.users
    for update to authenticated
    using (id = auth.uid())
    -- cannot self-promote to super_admin, cannot hop to another tenant
    with check (
        id = auth.uid()
        and role = 'client'
        and tenant_id = (select public.get_tenant_id())
    );

create policy "super admin manages users" on public.users
    for all to authenticated
    using ((select public.is_super_admin()))
    with check ((select public.is_super_admin()));

-- ---- generic tenant-isolation policies -------------------------------------
-- contacts
create policy "tenant isolation contacts" on public.contacts
    for all to authenticated
    using (tenant_id = (select public.get_tenant_id()) or (select public.is_super_admin()))
    with check (tenant_id = (select public.get_tenant_id()) or (select public.is_super_admin()));

-- whatsapp_connections (read-only for clients; writes happen server-side)
create policy "tenant reads own connection" on public.whatsapp_connections
    for select to authenticated
    using (tenant_id = (select public.get_tenant_id()) or (select public.is_super_admin()));

-- whatsapp_templates
create policy "tenant isolation templates" on public.whatsapp_templates
    for all to authenticated
    using (tenant_id = (select public.get_tenant_id()) or (select public.is_super_admin()))
    with check (tenant_id = (select public.get_tenant_id()) or (select public.is_super_admin()));

-- campaigns
create policy "tenant isolation campaigns" on public.campaigns
    for all to authenticated
    using (tenant_id = (select public.get_tenant_id()) or (select public.is_super_admin()))
    with check (tenant_id = (select public.get_tenant_id()) or (select public.is_super_admin()));

-- conversations
create policy "tenant isolation conversations" on public.conversations
    for all to authenticated
    using (tenant_id = (select public.get_tenant_id()) or (select public.is_super_admin()))
    with check (tenant_id = (select public.get_tenant_id()) or (select public.is_super_admin()));

-- messages: clients can read; inserts/updates come from the server only
create policy "tenant reads own messages" on public.messages
    for select to authenticated
    using (tenant_id = (select public.get_tenant_id()) or (select public.is_super_admin()));

-- chatbot config
create policy "tenant isolation chatbot" on public.chatbot_configs
    for all to authenticated
    using (tenant_id = (select public.get_tenant_id()) or (select public.is_super_admin()))
    with check (tenant_id = (select public.get_tenant_id()) or (select public.is_super_admin()));

-- usage records: read-only for the owning tenant (transparency), full for admin
create policy "tenant reads own usage" on public.usage_records
    for select to authenticated
    using (tenant_id = (select public.get_tenant_id()) or (select public.is_super_admin()));
