"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Global type declaration for the Facebook SDK
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    FB: any;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface WhatsAppConnection {
  id: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  qualityRating: string | null;
  status: "disconnected" | "pending" | "connected" | "error";
  connectedAt: string | null;
}

interface MetaConfig {
  appId: string;
  configId: string;
  apiVersion: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface WabaEventData {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
}

interface WhatsAppSetupProps {
  tenantId: string;
  connection: WhatsAppConnection | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function WhatsAppSetup({ tenantId, connection }: WhatsAppSetupProps) {
  const router = useRouter();
  const [metaConfig, setMetaConfig] = useState<MetaConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const fbSdkLoaded = useRef(false);
  // Holds WABA metadata from the WA_EMBEDDED_SIGNUP message event
  const wabaDataRef = useRef<WabaEventData | null>(null);

  // Fetch the Meta app config on mount
  useEffect(() => {
    fetchMetaConfig();
  }, []);

  async function fetchMetaConfig() {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/meta/signup");
      if (!res.ok) {
        setMetaConfig(null);
        return;
      }
      const data = await res.json();
      setMetaConfig(data);
    } catch {
      setMetaConfig(null);
    } finally {
      setConfigLoading(false);
    }
  }

  // Load the Facebook JS SDK once we have the config
  const loadFacebookSdk = useCallback(() => {
    if (fbSdkLoaded.current || !metaConfig) return;
    fbSdkLoaded.current = true;

    (window as any).fbAsyncInit = function () {
      window.FB.init({
        appId: metaConfig.appId,
        xfbml: false,
        version: "v21.0",
      });
    };

    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [metaConfig]);

  // Listen for the WA_EMBEDDED_SIGNUP message event (contains WABA details)
  useEffect(() => {
    if (!metaConfig) return;
    loadFacebookSdk();

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "WA_EMBEDDED_SIGNUP") {
        const { wabaId, phoneNumberId, displayPhoneNumber, verifiedName } =
          event.data;

        if (wabaId && phoneNumberId) {
          wabaDataRef.current = {
            wabaId,
            phoneNumberId,
            displayPhoneNumber,
            verifiedName,
          };
          console.log("📩 WA_EMBEDDED_SIGNUP data captured", {
            wabaId,
            phoneNumberId,
          });
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [metaConfig, loadFacebookSdk]);

  async function handleConnect() {
    if (!metaConfig) {
      toast.error("Meta App is not configured yet.");
      return;
    }

    // Ensure the SDK is loaded
    loadFacebookSdk();

    if (!window.FB) {
      await new Promise<void>((resolve) => {
        const check = () => {
          if (window.FB) resolve();
          else setTimeout(check, 200);
        };
        check();
      });
    }

    setConnecting(true);

    // Reset captured WABA data before opening the dialog
    wabaDataRef.current = null;

    // Wait up to 10 seconds for the WA_EMBEDDED_SIGNUP message event after
    // the FB.login dialog closes (Meta fires it when signup completes).
    function waitForWabaData(timeoutMs = 10_000): Promise<WabaEventData | null> {
      return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
          if (wabaDataRef.current) {
            resolve(wabaDataRef.current);
          } else if (Date.now() - start > timeoutMs) {
            resolve(null);
          } else {
            setTimeout(check, 200);
          }
        };
        check();
      });
    }

    try {
      window.FB.login(
        async (response: any) => {
          try {
            if (
              response.status === "connected" &&
              response.authResponse?.code
            ) {
              const code = response.authResponse.code;

              // Wait for the WABA metadata from the post-message event
              const waba = await waitForWabaData();

              if (!waba) {
                toast.error(
                  "Signup completed but we couldn't retrieve the WhatsApp Business Account details. Please try again."
                );
                return;
              }

              // Send both the auth code and the WABA metadata to our backend
              const res = await fetch("/api/meta/callback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  code,
                  wabaId: waba.wabaId,
                  phoneNumberId: waba.phoneNumberId,
                  displayPhoneNumber: waba.displayPhoneNumber,
                  verifiedName: waba.verifiedName,
                }),
              });

              const data = await res.json();

              if (!res.ok) {
                throw new Error(data.error || "Failed to complete signup");
              }

              toast.success("WhatsApp connected successfully!");
              router.refresh();
            } else if (response.status === "not_authorized") {
              toast.error("You did not complete the WhatsApp signup.");
            } else {
              toast.error("Signup was cancelled.");
            }
          } catch (err) {
            console.error("Signup callback error:", err);
            toast.error(
              err instanceof Error
                ? err.message
                : "Failed to complete WhatsApp signup"
            );
          } finally {
            setConnecting(false);
          }
        },
        {
          config_id: metaConfig.configId,
          response_type: "code",
          override_default_response_type: true,
        }
      );
    } catch (error) {
      console.error("Meta signup error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start WhatsApp signup"
      );
      setConnecting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────
  const isConnected = connection?.status === "connected";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className={`flex size-10 items-center justify-center rounded-lg ${
              isConnected
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <MessageCircle className="size-5" />
          </div>
          <div>
            <CardTitle>WhatsApp Integration</CardTitle>
            <CardDescription>
              Connect your WhatsApp Business Account to send and receive
              messages.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection status */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Connection Status</p>
            {configLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Loading configuration…
              </div>
            ) : connection ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={connection.status} />
                  {connection.displayPhoneNumber && (
                    <span className="text-sm text-muted-foreground">
                      {connection.displayPhoneNumber}
                    </span>
                  )}
                </div>
                {connection.verifiedName && (
                  <p className="text-xs text-muted-foreground">
                    {connection.verifiedName}
                    {connection.qualityRating &&
                      ` · ${connection.qualityRating} quality`}
                  </p>
                )}
                {connection.connectedAt && (
                  <p className="text-xs text-muted-foreground">
                    Connected{" "}
                    {new Date(connection.connectedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="size-3" />
                Not connected
              </div>
            )}
          </div>

          {isConnected && (
            <div className="text-emerald-600">
              <CheckCircle2 className="size-6" />
            </div>
          )}
        </div>

        {/* Setup guide (shown when not connected and config missing) */}
        {!metaConfig && !configLoading && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Meta App not configured
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-400">
              To connect WhatsApp, you need to set up a Meta App with WhatsApp
              Embedded Signup enabled. Add the following environment variables:
            </p>
            <pre className="mt-2 rounded bg-amber-100/50 p-2 text-xs dark:bg-amber-900/50">
              {`NEXT_PUBLIC_META_APP_ID=your_app_id
NEXT_PUBLIC_META_CONFIG_ID=your_config_id
META_APP_SECRET=your_app_secret
META_WEBHOOK_VERIFY_TOKEN=choose_a_random_token`}
            </pre>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t pt-6">
        {!isConnected ? (
          <Button
            onClick={handleConnect}
            disabled={connecting || configLoading || !metaConfig}
            className="gap-2"
          >
            {connecting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <ExternalLink className="size-4" />
                Connect WhatsApp Business
              </>
            )}
          </Button>
        ) : (
          <div className="flex w-full items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Your WhatsApp Business Account is active and receiving messages.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                // TODO: Disconnect flow — revoke token and set status to
                // disconnected
                toast.info(
                  "Disconnect will be available in a future update."
                );
              }}
            >
              Disconnect
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------
function StatusBadge({
  status,
}: {
  status: WhatsAppConnection["status"];
}) {
  const map: Record<
    WhatsAppConnection["status"],
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    connected: { label: "Connected", variant: "default" },
    pending: { label: "Pending", variant: "secondary" },
    error: { label: "Error", variant: "destructive" },
    disconnected: { label: "Disconnected", variant: "outline" },
  };

  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}
