-- =============================================================================
-- Add system_prompt column to chatbot_configs for the editable AI system prompt
-- =============================================================================

alter table public.chatbot_configs
  add column if not exists system_prompt text;
