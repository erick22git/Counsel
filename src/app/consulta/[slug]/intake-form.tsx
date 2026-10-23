"use client";
import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { submitIntake, type PublicState } from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { MATTERS } from "@/lib/format";

export function IntakeForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<PublicState, FormData>(submitIntake, {});
  if (state.done) {
    return (
      <div className="enter text-center">
        <CheckCircle2 size={44} aria-hidden className="mx-auto text-ok" />
        <h3 className="mt-3 text-[length:var(--text-heading-sm)]">¡Recibimos tu consulta!</h3>
        <p className="mt-2 text-ink-2">Te contactaremos por el medio que dejaste.</p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="slug" value={slug} />
      <div aria-hidden className="absolute -left-[9999px]"><label>No llenar<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <Field label="Tu nombre" htmlFor="name"><Input id="name" name="name" autoComplete="name" required /></Field>
      <Field label="Correo (opcional si dejas teléfono)" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" /></Field>
      <Field label="Teléfono o WhatsApp" htmlFor="phone"><Input id="phone" name="phone" type="tel" autoComplete="tel" /></Field>
      <Field label="¿Sobre qué es tu consulta?" htmlFor="matter">
        <Select id="matter" name="matter" defaultValue="">
          <option value="">No estoy seguro</option>
          {Object.entries(MATTERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <Field label="Cuéntanos qué pasó" htmlFor="message"><Textarea id="message" name="message" rows={5} required /></Field>
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input type="checkbox" name="accept" required className="mt-1 size-5 accent-[var(--accent)]" />
        <span>Acepto que el despacho use estos datos para responderme, según la <Link href="/privacidad" target="_blank" className="font-medium text-accent underline underline-offset-4">política de privacidad</Link>.</span>
      </label>
      <p role="alert" className="text-danger empty:hidden">{state.error}</p>
      <Button type="submit" variant="primary" size="lg" disabled={pending}>{pending ? "Enviando…" : "Enviar consulta"}</Button>
    </form>
  );
}
