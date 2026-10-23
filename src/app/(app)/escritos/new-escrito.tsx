"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { fail } from "@/components/ui/undo-toast";
import { createBlankEscrito } from "./actions";

/** Botón "Nuevo escrito". Con ?nuevo=1 (Cmd+K) abre el diálogo directamente. */
export function NewEscrito({ defaultOpen = false, primary = true }: { defaultOpen?: boolean; primary?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(defaultOpen);
  const [busy, setBusy] = React.useState(false);

  async function blank() {
    setBusy(true);
    const r = await createBlankEscrito();
    if (!r.ok) {
      setBusy(false);
      return fail(r.error);
    }
    router.push(`/escritos/${r.id}`);
  }

  return (
    <>
      <Button variant={primary ? "primary" : "secondary"} onClick={() => setOpen(true)}>
        <Plus size={20} aria-hidden /> Nuevo escrito
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Nuevo escrito" description="¿Cómo quieres empezar?">
          <div className="grid gap-3">
            <Button variant="outline" size="lg" disabled={busy} onClick={blank}>Empezar en blanco</Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/plantillas">Elegir una plantilla</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
