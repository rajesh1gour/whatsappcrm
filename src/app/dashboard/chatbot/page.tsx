import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Bot } from "lucide-react";
import { ChatbotSettingsForm } from "./chatbot-settings-form";

export default async function ChatbotPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) redirect("/login");

  // Fetch the tenant's chatbot config (exists because the auth trigger creates one)
  const { data: config } = await supabase
    .from("chatbot_configs")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();

  // Build a default system prompt from the structured fields if no
  // custom system_prompt has been saved yet.
  const defaultSystemPrompt = config
    ? [
        `You are a helpful AI assistant for a business.`,
        config.business_description
          ? `\nBusiness context:\n${config.business_description}`
          : null,
        `\nTone: ${config.tone ?? "friendly"}. Keep responses concise, friendly, and helpful.`,
        `You are having a WhatsApp conversation with a customer.`,
        `Keep your responses under 400 words.`,
        `Do not use markdown formatting. Use plain text only.`,
        `If the customer asks to speak to a human, acknowledges they want human assistance,`,
        `or types any of these keywords: ${(config.handoff_keywords ?? ["human", "agent", "support"]).join(", ")}`,
        `you should politely let them know you're transferring them to a human agent.`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const mappedConfig = config
    ? {
        enabled: config.enabled,
        systemPrompt: config.system_prompt ?? defaultSystemPrompt,
        handoffKeywords: config.handoff_keywords ?? [
          "human",
          "agent",
          "support",
        ],
        maxAiReplies: config.max_ai_replies_per_conversation ?? 10,
      }
    : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          <Bot className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            AI Chatbot
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure the AI assistant that automatically replies to your
            WhatsApp conversations.
          </p>
        </div>
      </div>

      <ChatbotSettingsForm
        tenantId={profile.tenant_id}
        config={mappedConfig}
      />
    </div>
  );
}
