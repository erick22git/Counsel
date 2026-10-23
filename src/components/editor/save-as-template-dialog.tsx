"use client";
import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/field";
import { TextWithDictation } from "@/components/ui/text-with-dictation";
import { ok } from "@/components/ui/undo-toast";
import { saveAsTemplate } from "@/app/(app)/escritos/actions";
import { TEMPLATE_CATEGORIES } from "@/lib/editor/categories";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultTitle: string;
  getHtml: () => string;
};

export function SaveAsTemplateDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent title="Guardar como plantilla" description="Quedará disponible solo para tu despacho, en Plantillas.">
        <SaveForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

// Se monta solo con el diálogo abierto: el estado se reinicia solo.
function SaveForm({ onOpenChange, defaultTitle, getHtml }: Props) {
  const [title, setTitle] = React.useState(defaultTitle);
  const [category, setCategory] = React.useState("General");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await saveAsTemplate({ title, category, description, html: getHtml() });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    ok("Plantilla guardada en tu despacho");
    onOpenChange(false);
  }

  return (
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Nombre de la plantilla" htmlFor="pl-nombre" error={error}>
            <Input id="pl-nombre" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          </Field>
          <Field label="Categoría" htmlFor="pl-cat">
            <Select id="pl-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {TEMPLATE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Descripción corta (opcional)" htmlFor="pl-desc">
            <TextWithDictation id="pl-desc" value={description} onChange={setDescription} rows={2} maxLength={300} />
          </Field>
          <p className="text-ink-2">Tip: si escribes {"{{cliente_nombre}}"} en el texto, esa parte se podrá completar al usar la plantilla.</p>
          <div>
            <Button type="submit" variant="primary" disabled={busy || !title.trim()}>Guardar plantilla</Button>
          </div>
        </form>
  );
}
