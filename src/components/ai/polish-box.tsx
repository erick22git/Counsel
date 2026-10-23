"use client";
import * as React from "react";
import { Wand2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { DictationButton } from "@/components/dictation/dictation-button";

/** Dictado → redacción corregida. El abogado ve el original y el corregido y decide. */
export function PolishBox({ onAccept, initial = "" }: { onAccept?: (text: string) => void; initial?: string }) {
  const [raw, setRaw] = React.useState(initial);
  const [polished, setPolished] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function polish() {
    setBusy(true);
    try {
      const r = await fetch("/api/ia/redactar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: raw }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setPolished(j.text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo corregir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-ink-2">Dicta o escribe tal como te salga. La IA corrige ortografía, puntuación y redacción formal, <strong>sin agregar datos</strong>. Se envía solo este texto.</p>
      <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={6} placeholder="Ej.: el cliente me dijo que el señor no pagó el alquiler desde marzo…" aria-label="Texto dictado" />
      <div className="flex flex-wrap items-center gap-2">
        <DictationButton onText={(t) => setRaw((v) => (v ? v + " " : "") + t)} />
        <Button variant="primary" onClick={polish} disabled={busy || raw.trim().length < 5}>
          <Wand2 size={18} aria-hidden /> {busy ? "Corrigiendo…" : "Corregir redacción"}
        </Button>
      </div>
      {polished && (
        <div className="enter grid gap-3 rounded-[var(--radius-card)] border border-line bg-surface-2 p-4">
          <p className="font-medium">Texto corregido</p>
          <p className="whitespace-pre-wrap leading-relaxed">{polished}</p>
          <div className="flex flex-wrap gap-2">
            {onAccept && (
              <Button variant="primary" onClick={() => { onAccept(polished); setPolished(""); setRaw(""); }}>
                Usar este texto
              </Button>
            )}
            <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(polished); toast.success("Copiado"); }}>
              <Copy size={18} aria-hidden /> Copiar
            </Button>
            <Button variant="ghost" onClick={() => setPolished("")}>Descartar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
