import "server-only";
import OpenAI from "openai";

/**
 * Server-only OpenAI client.
 *
 * The `server-only` import ensures this file is never bundled into
 * client-side code, keeping the API key safe.
 */
let _client: OpenAI | null = null;

/**
 * Returns a singleton OpenAI client instance.
 *
 * Lazy-initialised so that the API key is only read at first use,
 * not at module-import time.  This avoids crashes during Next.js
 * static generation or build-time pre-renders.
 */
export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing OPENAI_API_KEY environment variable. " +
          "Set it in your .env.local or .env file."
      );
    }

    _client = new OpenAI({ apiKey });
  }
  return _client;
}
