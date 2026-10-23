"use client";
import * as React from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PolishBox } from "./polish-box";

/** "Mejorar redacción con IA": abre el corrector con el texto elegido; al aceptar, lo reemplaza. */
export function ImproveButton({ getText, onAccept }: { getText: () => string; onAccept: (text: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [initial, setInitial] = React.useState("");
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setInitial(getText());
          setOpen(true);
        }}
      >
        <Wand2 size={18} aria-hidden /> Mejorar redacción con IA
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Mejorar redacción" description="Selecciona un párrafo en el escrito antes de abrir esto, o pega el texto aquí.">
          {open && (
            <PolishBox
              initial={initial}
              onAccept={(t) => {
                onAccept(t);
                setOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
