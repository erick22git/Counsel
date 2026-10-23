"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toastWithUndo, fail } from "@/components/ui/undo-toast";
import { confirmRequest, convertIntake, dismissIntake, rejectRequest } from "./actions";

export function InboxActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await convertIntake(id);
          setBusy(false);
          if (!r.ok) return fail(r.error);
          toast.success("Cliente y caso creados");
          router.push(r.caseId ? `/casos/${r.caseId}` : "/casos");
        }}
      >
        Crear cliente y caso
      </Button>
      <Button
        variant="outline"
        onClick={async () => {
          await dismissIntake(id);
          router.refresh();
          toastWithUndo("Consulta descartada", async () => { await dismissIntake(id, true); router.refresh(); });
        }}
      >
        Descartar
      </Button>
    </div>
  );
}

export function RequestActions({ id }: { id: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" onClick={async () => { const r = await confirmRequest(id); if (!r.ok) return fail(r.error); toast.success("Cita confirmada y agregada a tu agenda"); router.refresh(); }}>
        Confirmar cita
      </Button>
      <Button variant="outline" onClick={async () => { await rejectRequest(id); toast("Solicitud rechazada"); router.refresh(); }}>No puedo en ese horario</Button>
    </div>
  );
}

export function ShareLinks({ consulta, reservar }: { consulta: string; reservar: string }) {
  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Enlace copiado"));
  return (
    <Card className="grid gap-4">
      <h2 className="text-[length:var(--text-subheading)]">Tus enlaces para compartir</h2>
      {[["Formulario de consulta", consulta], ["Reservar una cita", reservar]].map(([label, url]) => (
        <div key={label} className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0"><p className="font-medium">{label}</p><p className="truncate text-ink-2">{url}</p></div>
          <Button variant="outline" onClick={() => copy(url)}><Copy size={18} aria-hidden /> Copiar enlace</Button>
        </div>
      ))}
    </Card>
  );
}
