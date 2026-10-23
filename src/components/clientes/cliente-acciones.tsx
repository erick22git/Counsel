"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClienteDialog } from "@/components/clientes/cliente-dialog";
import { fail, toastWithUndo } from "@/components/ui/undo-toast";
import { inviteClientToPortal } from "@/lib/portal/invite";
import { toast } from "sonner";
import { archiveClientAction, restoreClientAction } from "@/app/(app)/clientes/actions";
import type { Client } from "@/lib/db/types";

/** Botones "Editar" y "Archivar" de la ficha del cliente. */
export function ClienteAcciones({ cliente }: { cliente: Client }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  async function archive() {
    const r = await archiveClientAction(cliente.id);
    if (!r.ok) return fail(r.error);
    router.push("/clientes");
    toastWithUndo(`“${cliente.full_name}” se archivó`, async () => {
      const u = await restoreClientAction(cliente.id);
      if (!u.ok) { fail(u.error); return; }
      router.push(`/clientes/${cliente.id}`);
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => setOpen(true)}><Pencil size={18} aria-hidden /> Editar datos</Button>
      <Button
        variant="outline"
        onClick={async () => {
          const r = await inviteClientToPortal(cliente.id);
          if (r.ok) toast.success("Invitación enviada por correo");
          else fail(r.error ?? "No se pudo invitar");
        }}
      >
        Invitar al portal
      </Button>
      <Button variant="outline" onClick={archive}><Archive size={18} aria-hidden /> Archivar cliente</Button>
      <ClienteDialog open={open} onOpenChange={setOpen} cliente={cliente} />
    </div>
  );
}
