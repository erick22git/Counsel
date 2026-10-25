import Anthropic from "@anthropic-ai/sdk";
import { ProviderConfigError, type GenerateParams, type LLMProvider } from "./types";

type Req = Parameters<Anthropic["messages"]["create"]>[0];

export function anthropicProvider(env: NodeJS.ProcessEnv = process.env): LLMProvider {
  const model = env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  let client: Anthropic | null = null;
  const get = () => {
    if (!env.ANTHROPIC_API_KEY) throw new ProviderConfigError("Falta ANTHROPIC_API_KEY.");
    return (client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }));
  };
  const body = (p: GenerateParams) =>
    ({
      model,
      max_tokens: p.maxTokens ?? 4000,
      system: p.system,
      messages: p.messages,
      output_config: { effort: p.effort ?? "medium" },
    }) as unknown as Req;

  return {
    id: "anthropic",
    label: "Claude (Anthropic)",
    model,
    privacy: "cloud-paid",
    async *stream(p) {
      const stream = get().messages.stream(body(p) as Parameters<Anthropic["messages"]["stream"]>[0]);
      for await (const ev of stream) {
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") yield "\n\n[La IA no pudo responder a esta consulta.]";
    },
    async complete(p) {
      const res = (await get().messages.create(body(p) as Parameters<Anthropic["messages"]["create"]>[0] & { stream?: false })) as { content: { type: string; text?: string }[] };
      return res.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    },
  };
}
