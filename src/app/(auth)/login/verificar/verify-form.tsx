"use client";
import { useActionState } from "react";
import { cancelVerify, verifyLogin, type VerifyState } from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function VerifyForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<VerifyState, FormData>(verifyLogin, {});
  return (
    <div className="grid gap-5">
      <form action={action} className="grid gap-5">
        <input type="hidden" name="siguiente" value={next ?? ""} />
        <Field label="Código de 6 números" htmlFor="code" error={state.error} hint="El código cambia cada 30 segundos.">
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} required autoFocus
            className="text-center text-2xl tracking-[0.4em]" />
        </Field>
        <Button type="submit" variant="primary" size="lg" disabled={pending}>{pending ? "Verificando…" : "Verificar"}</Button>
      </form>
      <form action={cancelVerify}>
        <Button type="submit" variant="ghost" className="w-full">Volver a entrar con otra cuenta</Button>
      </form>
    </div>
  );
}
