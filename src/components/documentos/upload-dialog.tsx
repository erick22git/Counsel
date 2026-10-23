"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { ok } from "@/components/ui/undo-toast";
import { createDocument } from "@/app/(app)/documentos/actions";
import { FileDrop } from "./file-drop";
import { removeFromStorage, uploadToStorage } from "./upload-client";
import { titleFromFileName, validateFile } from "@/lib/documentos/files";

export interface CaseOption { id: string; label: string }

export function UploadDialog({
  firmId, cases, defaultCaseId, defaultOpen,
}: { firmId: string; cases: CaseOption[]; defaultCaseId?: string | null; defaultOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(!!defaultOpen);
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [caseId, setCaseId] = React.useState(defaultCaseId ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  function pick(f: File) {
    const c = validateFile(f);
    if (!c.ok) {
      setFile(null);
      setError(c.error);
      return;
    }
    setError(null);
    setFile(f);
    if (!title.trim()) setTitle(titleFromFileName(f.name));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Primero elija un archivo.");
    if (!title.trim()) return setError("Escriba un título.");
    setBusy(true);
    setError(null);
    const up = await uploadToStorage(file, firmId, caseId || null);
    if (!up.ok) {
      setBusy(false);
      return setError(up.error);
    }
    const res = await createDocument({ ...up, title: title.trim(), caseId: caseId || null });
    setBusy(false);
    if (!res.ok) {
      await removeFromStorage(up.path);
      return setError(res.error);
    }
    ok("Documento subido");
    setOpen(false);
    setFile(null);
    setTitle("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
      <DialogTrigger asChild>
        <Button variant="primary">Subir documento</Button>
      </DialogTrigger>
      <DialogContent title="Subir documento" description="Se guarda en su despacho, protegido y con historial de versiones.">
        <form onSubmit={submit} className="grid gap-4">
          <FileDrop file={file} onFile={pick} disabled={busy} />
          <Field label="Título" htmlFor="doc-title">
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} disabled={busy} />
          </Field>
          <Field label="Caso (opcional)" htmlFor="doc-case" hint="Si no elige un caso, queda como documento general.">
            <Select id="doc-case" value={caseId} onChange={(e) => setCaseId(e.target.value)} disabled={busy}>
              <option value="">Sin caso (general)</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </Field>
          <p role="alert" aria-live="polite" className="text-danger empty:hidden">{error}</p>
          <div className="flex justify-end">
            <Button type="submit" variant="outline" size="lg" disabled={busy || !file}>
              {busy ? "Subiendo…" : "Guardar documento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
