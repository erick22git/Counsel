import type { GenerateParams, LLMProvider } from "./types";

/**
 * Proveedor de prueba, determinista y sin red. Para tests, CI y desarrollo sin claves.
 * - Si el mensaje trae FUENTES con [S1], responde citando [S1] y repitiendo un fragmento.
 * - Si pide JSON, devuelve un objeto vacío válido.
 * - En otro caso devuelve el texto recibido (útil para "redactar").
 */
export function mockProvider(opts: { reply?: (p: GenerateParams) => string } = {}): LLMProvider {
  const reply =
    opts.reply ??
    ((p: GenerateParams) => {
      const last = p.messages[p.messages.length - 1]?.content ?? "";
      if (p.json) return '{"values":{},"missing":[]}';
      const m = /\[S1\][^\n]*\n([^\n]+)/.exec(last);
      if (m) return `Según la fuente: ${m[1].slice(0, 160)} [S1]`;
      return last.slice(0, 400);
    });
  return {
    id: "mock",
    label: "Simulador (pruebas)",
    model: "mock-1",
    privacy: "mock",
    async *stream(p) {
      for (const w of reply(p).split(/(\s+)/)) if (w) yield w;
    },
    async complete(p) {
      return reply(p);
    },
  };
}
