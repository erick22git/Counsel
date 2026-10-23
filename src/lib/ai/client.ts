import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** Modelo configurable. Por defecto el más capaz recomendado; para ahorrar usa ANTHROPIC_MODEL=claude-sonnet-5-5. */
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

let _client: Anthropic | null = null;
export function getAnthropic() {
  if (!_client) _client = new Anthropic();
  return _client;
}
