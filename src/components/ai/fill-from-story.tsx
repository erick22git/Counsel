"use client";
import * as React from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TextWithDictation } from "@/components/ui/text-with-dictation";

/** Generador desde plantilla: cuenta el caso (dictado o escrito) y la IA propone los datos; tú revisas antes de crear el escrito. */
export function FillFromStory({ templateId, onValues }: { templateId: string; onValues: (v: Record<string, string>) => void }) {
  const [story, setStory] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="grid gap-3 rounded-lg bg-accent-soft p-4">
      <p className="flex items-center gap-2 font-medium"><Sparkles size={18} aria-hidden /> Rellenar con IA (opcional)</p>
      <p className="text-[length:var(--text-body-sm)] text-ink-2">Cuenta el caso con tus palabras. La IA propone los datos de la plantilla; <strong>no inventa los que falten</strong> y tú los revisas. Se envía solo este relato y los nombres de los campos.</p>
      <TextWithDictation value={story} onChange={setStory} rows={4} aria-label="Relato del caso" />
      <Button
        variant="secondary"
        disabled={busy || story.trim().length < 10}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch("/api/ia/generar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId, description: story }) });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error);
            onValues(j.values);
            toast.success(`Se llenaron ${Object.keys(j.values).length} campos. Revísalos.`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "No se pudo generar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Leyendo tu relato…" : "Proponer datos"}
      </Button>
    </div>
  );
}
