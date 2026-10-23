"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Printer, Send, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { fail, ok, toastWithUndo } from "@/components/ui/undo-toast";
import { markSent, restoreInvoice, voidInvoice } from "@/app/(app)/cobros/actions";
import type { StoredStatus } from "@/lib/cobros/status";

/** Un solo botón primario por pantalla: "Registrar pago" (en PaymentsSection). Aquí todo es secundario. */
export function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: StoredStatus }) {
  const router = useRouter();
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function send() {
    setBusy(true);
    const r = await markSent(invoiceId);
    setBusy(false);
    if (!r.ok) return fail(r.error);
    ok("Marcado como enviado.");
    router.refresh();
  }

  async function anular() {
    setBusy(true);
    const r = await voidInvoice(invoiceId);
    setBusy(false);
    setConfirm(false);
    if (!r.ok) return fail(r.error);
    router.refresh();
    toastWithUndo("Cobro anulado.", async () => {
      const u = await restoreInvoice({ id: invoiceId, prevStatus: r.prevStatus, prevPaidAt: r.prevPaidAt, releasedIds: r.releasedIds });
      if (!u.ok) { fail(u.error); return; }
      ok("Cobro restaurado.");
      router.refresh();
    });
  }

  return (
    <div className="no-print flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => window.print()}>
        <Printer size={20} aria-hidden /> Imprimir / guardar PDF
      </Button>
      {status === "borrador" && (
        <Button variant="secondary" disabled={busy} onClick={send}>
          <Send size={20} aria-hidden /> Marcar como enviada
        </Button>
      )}
      {status !== "anulada" && (
        <Button variant="danger" disabled={busy} onClick={() => setConfirm(true)}>
          <Ban size={20} aria-hidden /> Anular
        </Button>
      )}
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent title="¿Anular este cobro?" description="Dejará de contar como por cobrar y las horas que traía quedarán libres para cobrarlas de nuevo. Podrás deshacerlo por unos segundos.">
          <div className="flex flex-wrap justify-end gap-3">
            <DialogClose asChild><Button variant="outline">No, volver</Button></DialogClose>
            <Button variant="danger" disabled={busy} onClick={anular}>Sí, anular</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
