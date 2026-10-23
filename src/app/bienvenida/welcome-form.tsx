"use client";
import { useActionState } from "react";
import { completeFirm, type FormState } from "../(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function WelcomeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(completeFirm, {});
  return (
    <form action={action} className="grid gap-5">
      <Field label="Tu nombre completo" htmlFor="full_name"><Input id="full_name" name="full_name" required /></Field>
      <Field label="Nombre del despacho" htmlFor="firm_name" error={state.error}><Input id="firm_name" name="firm_name" required /></Field>
      <p className="text-ink-2">Al continuar aceptas los términos de uso y la política de privacidad.</p>
      <Button type="submit" variant="primary" size="lg" disabled={pending}>{pending ? "Creando…" : "Empezar"}</Button>
    </form>
  );
}
