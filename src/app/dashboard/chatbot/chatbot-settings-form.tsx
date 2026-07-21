"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatbotConfig {
  enabled: boolean;
  systemPrompt: string;
  handoffKeywords: string[];
  maxAiReplies: number;
}

interface ChatbotSettingsFormProps {
  tenantId: string;
  config: ChatbotConfig | null;
}

// ---------------------------------------------------------------------------
// Default system prompt template
// ---------------------------------------------------------------------------

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant for a business.

Business context:
[Describe your business here — e.g., "We are a shoe store specializing in running shoes..."]

Tone: friendly. Keep responses concise, friendly, and helpful.
You are having a WhatsApp conversation with a customer.
Keep your responses under 400 words.
Do not use markdown formatting. Use plain text only.
If the customer asks to speak to a human, acknowledges they want human assistance,
or types any of these keywords: human, agent, support
you should politely let them know you're transferring them to a human agent.`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatbotSettingsForm({
  tenantId,
  config,
}: ChatbotSettingsFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [systemPrompt, setSystemPrompt] = useState(
    config?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT
  );
  const [handoffKeywords, setHandoffKeywords] = useState(
    config?.handoffKeywords.join(", ") ?? "human, agent, support"
  );
  const [maxAiReplies, setMaxAiReplies] = useState(
    String(config?.maxAiReplies ?? 10)
  );

  async function handleSave() {
    setSaving(true);
    try {
      const keywords = handoffKeywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      const maxReplies = Math.max(1, parseInt(maxAiReplies, 10) || 10);

      const res = await fetch("/api/chatbot/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          systemPrompt: systemPrompt.trim(),
          handoffKeywords: keywords.length > 0 ? keywords : ["human", "agent", "support"],
          maxAiReplies: maxReplies,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      toast.success("Chatbot settings saved successfully!");
      router.refresh();
    } catch (error) {
      console.error("Save chatbot settings error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save chatbot settings"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ── Main settings ─────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-6">
        {/* Toggle Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Chatbot Status</CardTitle>
                <CardDescription>
                  Turn the AI chatbot on or off for incoming WhatsApp messages.
                </CardDescription>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <div className="h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-zinc-900" />
              </label>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`rounded-lg border p-4 text-sm transition-colors ${
                enabled
                  ? "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300"
                  : "border-muted bg-muted/50 text-muted-foreground"
              }`}
            >
              <div className="flex items-start gap-3">
                <Sparkles
                  className={`mt-0.5 size-4 ${
                    enabled ? "text-purple-500" : "text-muted-foreground"
                  }`}
                />
                <div>
                  <p className="font-medium">
                    {enabled
                      ? "Chatbot is active"
                      : "Chatbot is paused"}
                  </p>
                  <p className="mt-1 text-xs opacity-80">
                    {enabled
                      ? "New incoming WhatsApp messages will receive an AI-generated reply automatically."
                      : "Incoming messages will be received but no automated AI replies will be sent."}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Prompt Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-purple-500" />
              <CardTitle className="text-base">System Prompt</CardTitle>
            </div>
            <CardDescription>
              Customize the instruction that tells the AI how to behave, what
              tone to use, and what your business does. Edit this directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="system-prompt">AI Instructions</Label>
              <Textarea
                id="system-prompt"
                placeholder={DEFAULT_SYSTEM_PROMPT}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={12}
                className="resize-y font-mono text-sm"
                disabled={!enabled}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This is the full system prompt sent to the AI model. Describe your
              business, set the tone, and define any rules the AI should follow.
            </p>
          </CardContent>
        </Card>

        {/* Handoff Keywords Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Human Handoff Keywords
            </CardTitle>
            <CardDescription>
              When a customer types any of these words, the chatbot will stop
              replying and flag the conversation for a human agent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="human, agent, support, speak to a person"
              value={handoffKeywords}
              onChange={(e) => setHandoffKeywords(e.target.value)}
              disabled={!enabled}
            />
            <p className="text-xs text-muted-foreground">
              Separate keywords with commas. Case-insensitive.
            </p>
          </CardContent>
        </Card>

        {/* Max AI Replies Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Max AI Replies per Conversation
            </CardTitle>
            <CardDescription>
              Limit how many times the AI can reply in a single conversation
              before requiring human intervention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={100}
                value={maxAiReplies}
                onChange={(e) => setMaxAiReplies(e.target.value)}
                disabled={!enabled}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">replies</span>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Sidebar info ─────────────────────────────────────────── */}
      <div className="lg:col-span-1">
        <Card className="sticky top-8">
          <CardHeader>
            <CardTitle className="text-base">How It Works</CardTitle>
            <CardDescription>
              The AI chatbot automatically replies to incoming WhatsApp
              messages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Human Handoff</h4>
              <p className="text-muted-foreground">
                When a customer types a handoff keyword (e.g., "Human" or
                "Agent"), the AI stops responding and the conversation is
                flagged for a human agent.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Message Limit</h4>
              <p className="text-muted-foreground">
                After the AI has replied the max number of times in a
                conversation, it switches to human mode and sends a notification
                to the customer.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Environment Variable</h4>
              <p className="text-muted-foreground">
                This feature requires <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">OPENAI_API_KEY</code> to be set in your{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env.local</code> file.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
