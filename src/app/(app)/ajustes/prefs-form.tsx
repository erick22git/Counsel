"use client";
import { Card } from "@/components/ui/card";
import { usePrefs } from "@/components/shell/prefs-provider";
import { cn } from "@/lib/utils";
import type { Preferences } from "@/lib/db/types";

function Choice<K extends keyof Preferences>({ label, name, options }: { label: string; name: K; options: { v: Preferences[K]; t: string }[] }) {
  const { prefs, setPref } = usePrefs();
  return (
    <fieldset>
      <legend className="mb-2 font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={prefs[name] === o.v}
            onClick={() => setPref(name, o.v)}
            className={cn(
              "press min-h-12 cursor-pointer rounded-[var(--radius-btn)] border px-5",
              prefs[name] === o.v ? "border-accent bg-accent-soft font-medium text-accent" : "border-line-strong bg-surface hover:bg-surface-2"
            )}
          >
            {o.t}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function PrefsForm() {
  return (
    <Card className="grid gap-6">
      <h2 className="text-[length:var(--text-heading-sm)]">Cómo quieres verlo</h2>
      <Choice label="Tema" name="theme" options={[{ v: "claro", t: "Claro" }, { v: "oscuro", t: "Oscuro" }, { v: "sistema", t: "Como mi equipo" }]} />
      <Choice label="Tamaño de letra" name="fontSize" options={[{ v: "normal", t: "Normal" }, { v: "grande", t: "Grande" }, { v: "muy-grande", t: "Muy grande" }]} />
      <Choice label="Espacio entre elementos" name="density" options={[{ v: "comoda", t: "Cómodo" }, { v: "compacta", t: "Compacto" }]} />
    </Card>
  );
}
