"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resetMemberMfa } from "@/app/(app)/ajustes/seguridad/actions";

/** Solo para el titular: quita la verificación de alguien que perdió su teléfono. */
export function MemberReset({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [ask, setAsk] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  if (!ask) return <Button variant="outline" size="sm" onClick={() => setAsk(true)}>Quitar verificación</Button>;
  return (
    <div className="grid gap-2">
      <p className="text-ink-2">¿Quitar la verificación en dos pasos de {name}? Podrá entrar solo con su contraseña y activarla de nuevo.</p>
      <div className="flex gap-2">
        <Button variant="danger" size="sm" disabled={busy} onClick={async () => {
          setBusy(true);
          const r = await resetMemberMfa(id);
          setBusy(false);
          if (!r.ok) return toast.error(r.error);
          toast.success(`Verificación de ${name} quitada`);
          setAsk(false); router.refresh();
        }}>Sí, quitar</Button>
        <Button variant="ghost" size="sm" onClick={() => setAsk(false)}>No</Button>
      </div>
    </div>
  );
}
