"use client";
import * as React from "react";
import Link from "next/link";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { acceptTerms } from "@/lib/legal/actions";

/** Si el usuario no aceptó la versión vigente, se le pide aceptar (no se puede cerrar sin aceptar). */
export function TermsGate({ needed }: { needed: boolean }) {
  const [open, setOpen] = React.useState(needed);
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent title="Actualizamos nuestros términos" description="Para seguir usando Counsel, acepta la versión vigente.">
        <p>
          Lee los <Link href="/terminos" target="_blank" className="text-accent underline">términos de uso</Link> y la{" "}
          <Link href="/privacidad" target="_blank" className="text-accent underline">política de privacidad</Link>.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="mt-5 w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await acceptTerms();
            setOpen(false);
          }}
        >
          Acepto
        </Button>
      </DialogContent>
    </Dialog>
  );
}
