"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function PasswordForm() {
  const router = useRouter();
  const [pw, setPw] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <form
      className="grid gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pw.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
        setBusy(true);
        const { error } = await createClient().auth.updateUser({ password: pw });
        setBusy(false);
        if (error) return setError("No se pudo guardar. Abre de nuevo el enlace de tu correo.");
        router.push("/portal");
      }}
    >
      <Field label="Nueva contraseña" htmlFor="pw" hint="Mínimo 8 caracteres" error={error}>
        <Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
      </Field>
      <Button type="submit" variant="primary" size="lg" disabled={busy}>{busy ? "Guardando…" : "Guardar y entrar"}</Button>
    </form>
  );
}
