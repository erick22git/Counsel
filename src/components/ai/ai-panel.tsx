"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import { X, Sparkles, Send, ShieldAlert, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { DictationButton } from "@/components/dictation/dictation-button";
import { PolishBox } from "./polish-box";
import { cn } from "@/lib/utils";

export const AI_DISCLAIMER = "No reemplaza la verificación oficial en la Gaceta Oficial de Bolivia.";

interface Cite { n: number; code: string; law_title: string; article: string | null; source_name: string; source_url: string | null; license: string; is_demo: boolean }
interface Msg { role: "user" | "assistant"; content: string; citations?: Cite[]; sent?: string; notice?: string }
type Mode = "legal" | "caso" | "redactar";

const CASE_RE = /^\/casos\/([0-9a-f-]{36})/;

/** Panel lateral de IA, disponible en todas las pantallas. */
export function AiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const caseId = CASE_RE.exec(pathname)?.[1] ?? null;
  const [mode, setMode] = React.useState<Mode>("legal");
  const effective: Mode = mode === "caso" && !caseId ? "legal" : mode;
  const [convs, setConvs] = React.useState<Record<string, Msg[]>>({});
  const key = effective === "caso" ? `caso:${caseId}` : effective;
  const msgs = React.useMemo(() => convs[key] ?? [], [convs, key]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [hidePII, setHidePII] = React.useState(true);
  const [disclosure, setDisclosure] = React.useState<{ label: string; count: number }[] | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const on = (e: Event) => {
      const m = (e as CustomEvent<{ mode?: Mode }>).detail?.mode;
      if (m) setMode(m);
    };
    window.addEventListener("counsel:open-ai", on);
    return () => window.removeEventListener("counsel:open-ai", on);
  }, []);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs, busy]);

  React.useEffect(() => {
    if (!open || effective !== "caso" || !caseId) return;
    let off = false;
    fetch("/api/ia/caso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId, question: "preview", preview: true, hidePII }) })
      .then((r) => r.json())
      .then((j) => !off && setDisclosure(j.disclosure ?? null))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [open, effective, caseId, hidePII]);

  const update = (fn: (m: Msg[]) => Msg[]) => setConvs((c) => ({ ...c, [key]: fn(c[key] ?? []) }));

  async function ask() {
    const q = input.trim();
    if (q.length < 3 || busy) return;
    setInput("");
    setBusy(true);
    const history = msgs.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    update((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch(effective === "caso" ? "/api/ia/caso" : "/api/ia/legal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(effective === "caso" ? { caseId, question: q, hidePII, history } : { question: q, history }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "No se pudo consultar.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === "meta") update((m) => patchLast(m, { sent: ev.sent }));
          else if (ev.type === "text") update((m) => patchLast(m, (l) => ({ content: l.content + ev.delta })));
          else if (ev.type === "notice") update((m) => patchLast(m, { notice: ev.message }));
          else if (ev.type === "done") update((m) => patchLast(m, { citations: ev.citations ?? [], notice: ev.invalid?.length ? "Atención: la respuesta menciona fuentes que no existen. No la uses sin verificar." : undefined }));
          else if (ev.type === "error") throw new Error(ev.message);
        }
      }
    } catch (e) {
      update((m) => patchLast(m, { content: e instanceof Error ? e.message : "Ocurrió un error.", notice: "error" }));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <aside aria-label="Asistente legal" className="enter no-print fixed inset-y-0 right-0 z-40 flex w-[min(100vw,26rem)] flex-col border-l border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="flex items-center gap-2 text-[length:var(--text-subheading)]">
          <Sparkles size={20} aria-hidden /> Asistente legal
        </h2>
        <button onClick={onClose} aria-label="Cerrar asistente" className="press grid size-11 cursor-pointer place-items-center rounded-lg hover:bg-surface-2">
          <X size={22} aria-hidden />
        </button>
      </div>

      <div role="tablist" aria-label="Qué quieres hacer" className="flex gap-1 border-b border-line px-3 pt-2">
        {(
          [
            ["legal", "Consulta legal"],
            ...(caseId ? ([["caso", "Este caso"]] as const) : []),
            ["redactar", "Redactar"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            role="tab"
            aria-selected={effective === m}
            onClick={() => setMode(m)}
            className={cn("press min-h-11 cursor-pointer border-b-2 px-3", effective === m ? "border-accent font-medium text-ink" : "border-transparent text-ink-2")}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="flex items-start gap-2 bg-warn-soft px-5 py-2 text-[length:var(--text-body-sm)] text-warn">
        <ShieldAlert size={18} aria-hidden className="mt-0.5 shrink-0" /> {AI_DISCLAIMER}
      </p>

      {effective === "redactar" ? (
        <div className="flex-1 overflow-y-auto p-5">
          <PolishBox />
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
            {effective === "caso" && (
              <div className="rounded-lg border border-line bg-surface-2 p-3 text-[length:var(--text-body-sm)]">
                <p className="flex items-center gap-2 font-medium"><Info size={16} aria-hidden /> Qué se envía a la IA</p>
                <ul className="mt-1 list-disc pl-5 text-ink-2">
                  {(disclosure ?? []).map((d) => (
                    <li key={d.label}>{d.count} · {d.label}</li>
                  ))}
                  <li>Tu pregunta y fragmentos de leyes de la base</li>
                </ul>
                <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={hidePII} onChange={(e) => setHidePII(e.target.checked)} className="size-5 accent-[var(--accent)]" />
                  Ocultar nombre y datos personales del cliente
                </label>
              </div>
            )}
            {effective === "legal" && msgs.length === 0 && (
              <div className="rounded-lg border border-line bg-surface-2 p-3 text-[length:var(--text-body-sm)] text-ink-2">
                <p className="flex items-center gap-2 font-medium text-ink"><Info size={16} aria-hidden /> Qué se envía a la IA</p>
                <p className="mt-1">Solo tu pregunta y fragmentos de leyes de la base. No se envían datos de tus casos ni de tus clientes. Responde con cita de la norma y el artículo; si no hay fuente, te lo dice.</p>
              </div>
            )}
            {msgs.length === 0 && (
              <p className="text-ink-2">
                {effective === "caso" ? "Pregunta sobre este caso: un resumen, qué falta, próximos pasos…" : "Pregunta algo como: ¿qué dice la ley sobre el plazo para contestar una demanda?"}
              </p>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={cn("rounded-[var(--radius-card)] p-3", m.role === "user" ? "ml-8 bg-accent-soft" : "border border-line")}>
                <p className="whitespace-pre-wrap leading-relaxed">{m.content || (busy && i === msgs.length - 1 ? "Buscando en las leyes…" : "")}</p>
                {m.notice && m.notice !== "error" && <p className="mt-2 text-[length:var(--text-body-sm)] text-danger">{m.notice}</p>}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 border-t border-line pt-2 text-[length:var(--text-body-sm)]">
                    <p className="font-medium">Fuentes</p>
                    <ul className="mt-1 grid gap-1 text-ink-2">
                      {m.citations.map((c) => (
                        <li key={c.n}>
                          [S{c.n}] {c.law_title}{c.article ? `, ${c.article}` : ""} — {c.source_name} ({c.license}){c.is_demo ? " · DEMO, no vigente" : ""}
                          {c.source_url && (
                            <a href={c.source_url} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-accent underline">
                              ver <ExternalLink size={12} aria-hidden />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {m.role === "assistant" && m.sent && <p className="mt-2 text-[0.8rem] text-ink-3">Enviado a la IA: {m.sent}</p>}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="border-t border-line p-4">
            <label htmlFor="ai-input" className="sr-only">Tu pregunta</label>
            <Textarea id="ai-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu pregunta…" rows={3} className="min-h-24" />
            <div className="mt-2 flex items-center justify-between gap-2">
              <DictationButton onText={(t) => setInput((v) => (v ? v + " " : "") + t)} />
              <Button variant="primary" onClick={ask} disabled={busy || input.trim().length < 3}>
                <Send size={18} aria-hidden /> {busy ? "Pensando…" : "Preguntar"}
              </Button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

function patchLast(list: Msg[], p: Partial<Msg> | ((l: Msg) => Partial<Msg>)): Msg[] {
  const copy = [...list];
  const last = copy[copy.length - 1];
  if (!last) return copy;
  copy[copy.length - 1] = { ...last, ...(typeof p === "function" ? p(last) : p) };
  return copy;
}
