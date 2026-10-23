"use client";
import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { requestAppointment } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

type Step = "name" | "reason" | "when" | "contact" | "done";
const QUESTIONS: Record<Exclude<Step, "done">, string> = {
  name: "Hola 👋 ¿Cómo te llamas?",
  reason: "Gracias. ¿Sobre qué quieres consultar? (una frase basta)",
  when: "¿Qué día y hora te vendría bien?",
  contact: "Última pregunta: ¿a qué correo o teléfono te confirmamos?",
};
const ORDER: Exclude<Step, "done">[] = ["name", "reason", "when", "contact"];

/** Bot de citas simple: una pregunta a la vez, sin IA, con botón "Atrás". */
export function BookingBot({ slug }: { slug: string }) {
  const [step, setStep] = React.useState<Step>("name");
  const [v, setV] = React.useState({ name: "", reason: "", when: "", contact: "" });
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function next(e: React.FormEvent) {
    e.preventDefault();
    if (step === "done") return;
    const val = v[step as keyof typeof v].trim();
    if (!val) return setError("Escribe tu respuesta para continuar.");
    setError("");
    const i = ORDER.indexOf(step);
    if (i < ORDER.length - 1) return setStep(ORDER[i + 1]);
    setBusy(true);
    const r = await requestAppointment({ slug, name: v.name, reason: v.reason, contact: v.contact, preferred: v.when.length === 16 ? `${v.when}:00-04:00` : v.when }); // hora de La Paz (UTC-4)
    setBusy(false);
    if (r.ok) setStep("done");
    else setError(r.error ?? "No se pudo enviar.");
  }

  if (step === "done") {
    return (
      <div className="enter text-center">
        <CheckCircle2 size={44} aria-hidden className="mx-auto text-ok" />
        <h3 className="mt-3 text-[length:var(--text-heading-sm)]">Solicitud enviada</h3>
        <p className="mt-2 text-ink-2">El despacho confirmará tu cita por el medio que dejaste.</p>
      </div>
    );
  }
  const i = ORDER.indexOf(step);
  return (
    <form onSubmit={next} className="grid gap-4" key={step}>
      <p className="text-ink-2" aria-live="polite">Pregunta {i + 1} de {ORDER.length}</p>
      <label htmlFor="q" className="enter rounded-2xl bg-brand p-4 text-[length:var(--text-subheading)]">{QUESTIONS[step]}</label>
      <Input
        id="q"
        autoFocus
        type={step === "when" ? "datetime-local" : "text"}
        value={v[step]}
        onChange={(e) => setV({ ...v, [step]: e.target.value })}
        autoComplete={step === "name" ? "name" : step === "contact" ? "email" : "off"}
      />
      <p role="alert" className="text-danger empty:hidden">{error}</p>
      <div className="flex gap-3">
        {i > 0 && <Button variant="outline" onClick={() => setStep(ORDER[i - 1])}>Atrás</Button>}
        <Button type="submit" variant="primary" disabled={busy} className="flex-1">
          {i === ORDER.length - 1 ? (busy ? "Enviando…" : "Enviar solicitud") : "Siguiente"}
        </Button>
      </div>
    </form>
  );
}
