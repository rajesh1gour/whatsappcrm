-- =============================================================================
-- Add 'free' and 'canceled' tiers to the subscription_tier enum
-- =============================================================================
-- PostgreSQL ALTER TYPE ... ADD VALUE can only add one value at a time.
-- Ordering reflects the natural progression:
--   free → basic → standard → premium → canceled
alter type subscription_tier add value 'free' before 'basic';
alter type subscription_tier add value 'canceled' after 'premium';
