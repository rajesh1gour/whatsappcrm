-- =============================================================================
-- RPC functions for the Super Admin Dashboard
-- These aggregate data across all tenants (super_admin only, enforced at the
-- application layer).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- get_admin_tenant_summary: Returns one row per tenant with aggregated stats.
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_tenant_summary()
returns table (
    id                    uuid,
    name                  text,
    status                tenant_status,
    subscription_tier     subscription_tier,
    monthly_message_limit integer,
    message_count         integer,
    stripe_customer_id    text,
    created_at            timestamptz,
    contacts_count        bigint,
    total_messages        bigint,
    total_ai_replies      bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
    return query
    select
        t.id,
        t.name,
        t.status,
        t.subscription_tier,
        t.monthly_message_limit,
        t.message_count,
        t.stripe_customer_id,
        t.created_at,
        coalesce(c.contacts_count, 0)::bigint,
        coalesce(m.total_messages, 0)::bigint,
        coalesce(m.ai_replies, 0)::bigint
    from public.tenants t
    left join lateral (
        select count(*) as contacts_count
        from public.contacts
        where tenant_id = t.id
    ) c on true
    left join lateral (
        select
            count(*) as total_messages,
            count(*) filter (where sent_by_ai = true) as ai_replies
        from public.messages
        where tenant_id = t.id
    ) m on true
    order by t.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_usage_summary: Returns aggregated cost & revenue data.
-- Returns a single row with totals.
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_usage_summary()
returns table (
    total_cost          numeric,
    total_revenue       numeric,
    marketing_cost      numeric,
    utility_cost        numeric,
    service_cost        numeric,
    openai_tokens_cost  numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
    return query
    select
        coalesce(sum(unit_cost_usd * quantity), 0)::numeric(12,2) as total_cost,
        coalesce(sum(unit_price_usd * quantity), 0)::numeric(12,2) as total_revenue,
        coalesce(sum(unit_cost_usd * quantity) filter (where kind = 'wa_marketing'), 0)::numeric(12,2) as marketing_cost,
        coalesce(sum(unit_cost_usd * quantity) filter (where kind = 'wa_utility'), 0)::numeric(12,2) as utility_cost,
        coalesce(sum(unit_cost_usd * quantity) filter (where kind = 'wa_service'), 0)::numeric(12,2) as service_cost,
        coalesce(sum(unit_cost_usd * quantity) filter (where kind = 'openai_tokens'), 0)::numeric(12,2) as openai_tokens_cost
    from public.usage_records;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_daily_usage: Returns daily usage totals for charts.
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_daily_usage(
    days_back integer default 30
)
returns table (
    day         date,
    messages    bigint,
    ai_replies  bigint,
    cost_usd    numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
    return query
    with date_series as (
        select generate_series(
            current_date - days_back,
            current_date,
            '1 day'::interval
        )::date as day
    )
    select
        ds.day,
        coalesce(count(m.id), 0)::bigint as messages,
        coalesce(count(m.id) filter (where m.sent_by_ai = true), 0)::bigint as ai_replies,
        coalesce(sum(u.unit_cost_usd * u.quantity), 0)::numeric(12,2) as cost_usd
    from date_series ds
    left join public.messages m
        on m.created_at::date = ds.day
    left join public.usage_records u
        on u.created_at::date = ds.day
    group by ds.day
    order by ds.day;
end;
$$;
