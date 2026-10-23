"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signUp, type FormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});
  return (
    <form action={action} className="grid gap-5">
      <Field label="Tu nombre completo" htmlFor="full_name">
        <Input id="full_name" name="full_name" autoComplete="name" required />
      </Field>
      <Field label="Nombre del despacho" htmlFor="firm_name" hint="Ejemplo: Despacho Rojas y Asociados">
        <Input id="firm_name" name="firm_name" required />
      </Field>
      <Field label="Correo electrónico" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input type="checkbox" name="accept" required className="mt-1 size-5 accent-[var(--accent)]" />
        <span>
          Acepto los{" "}
          <Link href="/terminos" target="_blank" className="font-medium text-accent underline underline-offset-4">términos de uso</Link> y la{" "}
          <Link href="/privacidad" target="_blank" className="font-medium text-accent underline underline-offset-4">política de privacidad</Link>.
        </span>
      </label>
      <p role="alert" className="text-danger empty:hidden">{state.error}</p>
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending ? "Creando…" : "Crear mi despacho"}
      </Button>
    </form>
  );
}
