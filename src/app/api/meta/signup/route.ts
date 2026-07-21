import { NextResponse } from "next/server";

/**
 * GET /api/meta/signup
 *
 * Returns the Meta App configuration needed by the frontend to initialise
 * the Facebook JS SDK and launch the WhatsApp Embedded Signup flow.
 *
 * All values are intentionally `NEXT_PUBLIC_*` because they are exposed to
 * the browser — the App Secret is NEVER sent here.
 */
export async function GET() {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;
  const apiVersion = process.env.NEXT_PUBLIC_META_GRAPH_API_VERSION ?? "v21.0";

  if (!appId || !configId) {
    return NextResponse.json(
      {
        error:
          "Meta App is not configured. Set NEXT_PUBLIC_META_APP_ID and NEXT_PUBLIC_META_CONFIG_ID.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    appId,
    configId,
    apiVersion,
  });
}
