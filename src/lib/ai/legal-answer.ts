// Núcleo de la consulta legal, SIN dependencias de servidor: lo usan la ruta /api/ia/legal y el arnés `npm run eval:ia`.
import type { LLMProvider, ChatMessage } from "./providers/types";
import { LEGAL_SYSTEM, NO_SOURCE_MESSAGE } from "./prompts";
import { sourcesBlock, usedCitations, invalidCitationMarkers, type SourceForPrompt } from "./text";

export type LawHitLike = SourceForPrompt & { id: string; rank: number };

export interface LegalAnswerCitation {
  n: number; code: string; law_title: string; article: string | null; source_name: string;
  source_url: string | null; license: string; is_demo: boolean;
}

export interface LegalAnswer {
  text: string;
  citations: LegalAnswerCitation[];
  /** Marcadores [S#] citados que no existen entre las fuentes entregadas (posible invención). */
  invalid: number[];
  /** Verdadero si no había fuentes y NO se llamó al modelo. */
  noSource: boolean;
  sources: LawHitLike[];
  /** Descripción legible de lo enviado al proveedor. */
  sent: string;
  charsSent: number;
}

export async function answerLegalQuestion(opts: {
  question: string;
  history?: ChatMessage[];
  retrieve: (q: string) => Promise<LawHitLike[]>;
  provider: LLMProvider;
  onText?: (delta: string) => void;
  onMeta?: (sent: string) => void;
}): Promise<LegalAnswer> {
  const sources = await opts.retrieve(opts.question);

  // Garantía anti-invención: sin fuentes no se llama al modelo.
  if (sources.length === 0) {
    const sent = "Nada: no hubo fuentes, no se consultó a la IA.";
    opts.onMeta?.(sent);
    opts.onText?.(NO_SOURCE_MESSAGE);
    return { text: NO_SOURCE_MESSAGE, citations: [], invalid: [], noSource: true, sources, sent, charsSent: 0 };
  }

  const sent = `Tu pregunta y ${sources.length} fragmentos de leyes de la base. No se envían datos de tus casos ni de tus clientes.`;
  opts.onMeta?.(sent);
  const userMsg = `FUENTES:\n${sourcesBlock(sources)}\n\nPREGUNTA DEL ABOGADO:\n${opts.question}`;
  let text = "";
  for await (const d of opts.provider.stream({
    system: LEGAL_SYSTEM,
    messages: [...(opts.history ?? []).slice(-6), { role: "user", content: userMsg }],
  })) {
    text += d;
    opts.onText?.(d);
  }
  const citations = usedCitations(text, sources).map(({ n, source }) => ({
    n, code: source.code, law_title: source.law_title, article: source.article, source_name: source.source_name,
    source_url: source.source_url, license: source.license, is_demo: source.is_demo,
  }));
  return { text, citations, invalid: invalidCitationMarkers(text, sources.length), noSource: false, sources, sent, charsSent: userMsg.length + LEGAL_SYSTEM.length };
}
