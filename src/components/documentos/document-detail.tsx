"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { TextWithDictation } from "@/components/ui/text-with-dictation";
import { fail, ok, toastWithUndo } from "@/components/ui/undo-toast";
import {
  addVersion, getSignedUrl, listVersions, renameDocument, restoreVersion, setDeleted, setDocumentCase, setShared, type VersionRow,
} from "@/app/(app)/documentos/actions";
import { fmtDateTime } from "@/lib/format";
import { formatBytes, previewKind } from "@/lib/documentos/files";
import type { Doc } from "@/lib/db/types";
import { FileDrop } from "./file-drop";
import { removeFromStorage, uploadToStorage } from "./upload-client";
import type { CaseOption } from "./upload-dialog";

import { LogView } from "@/components/auditoria/log-view";

export function DocumentDetail({
  doc, firmId, cases, onClose,
}: { doc: Doc; firmId: string; cases: CaseOption[]; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = React.useState(doc.title);
  const [versions, setVersions] = React.useState<VersionRow[] | null>(null);
  const [preview, setPreview] = React.useState<{ key: string; url: string } | null>(null);
  const previewKey = `${doc.id}:${doc.current_version}`;
  const previewUrl = preview?.key === previewKey ? preview.url : null;
  const [newFile, setNewFile] = React.useState<File | null>(null);
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const kind = previewKind(doc.mime);

  React.useEffect(() => {
    let alive = true;
    listVersions(doc.id).then((r) => { if (alive && r.ok) setVersions(r.versions); });
    return () => { alive = false; };
  }, [doc.id, doc.current_version]);

  React.useEffect(() => {
    let alive = true;
    if (kind) getSignedUrl({ documentId: doc.id }).then((r) => { if (alive && r.ok) setPreview({ key: previewKey, url: r.url }); });
    return () => { alive = false; };
  }, [doc.id, previewKey, kind]);

  async function download(version?: number) {
    const r = await getSignedUrl({ documentId: doc.id, version, download: true });
    if (!r.ok) return fail(r.error);
    window.location.assign(r.url);
  }

  async function rename() {
    if (title.trim() === doc.title) return;
    const r = await renameDocument({ id: doc.id, title });
    if (!r.ok) return fail(r.error);
    ok("Nombre cambiado");
    router.refresh();
  }

  async function changeCase(caseId: string) {
    const r = await setDocumentCase({ id: doc.id, caseId: caseId || null });
    if (!r.ok) return fail(r.error);
    ok("Caso actualizado");
    router.refresh();
  }

  async function toggleShare(v: boolean) {
    const r = await setShared({ id: doc.id, shared: v });
    if (!r.ok) return fail(r.error);
    ok(v ? "Ahora el cliente puede verlo en su portal" : "Ya no se comparte con el cliente");
    router.refresh();
  }

  async function uploadVersion() {
    if (!newFile) return setError("Primero elija el archivo de la nueva versión.");
    setBusy(true);
    setError(null);
    const up = await uploadToStorage(newFile, firmId, doc.case_id);
    if (!up.ok) {
      setBusy(false);
      return setError(up.error);
    }
    const r = await addVersion({ documentId: doc.id, ...up, note: note.trim() || undefined });
    setBusy(false);
    if (!r.ok) {
      await removeFromStorage(up.path);
      return setError(r.error);
    }
    ok(`Versión ${r.version} guardada`);
    setNewFile(null);
    setNote("");
    router.refresh();
  }

  async function restore(v: number) {
    setBusy(true);
    const r = await restoreVersion({ documentId: doc.id, version: v });
    setBusy(false);
    if (!r.ok) return fail(r.error);
    ok(`Versión ${v} restaurada como v${r.version}`);
    router.refresh();
  }

  async function remove() {
    const r = await setDeleted({ id: doc.id, deleted: true });
    if (!r.ok) return fail(r.error);
    onClose();
    router.refresh();
    toastWithUndo(`«${doc.title}» eliminado`, async () => {
      const u = await setDeleted({ id: doc.id, deleted: false });
      if (!u.ok) fail(u.error);
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      <LogView entity="documents" id={doc.id} />
      <div className="flex flex-wrap items-center gap-2 text-ink-2">
        <Pill tone="accent">v{doc.current_version}</Pill>
        <span>{formatBytes(doc.size_bytes)}</span>
        <span>· Actualizado {fmtDateTime(doc.updated_at)}</span>
      </div>

      {kind && (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-2">
          {!previewUrl ? (
            <p className="p-6 text-ink-2">Cargando vista previa…</p>
          ) : kind === "pdf" ? (
            <iframe src={previewUrl} title={`Vista previa de ${doc.title}`} className="h-[60dvh] w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={`Vista previa de ${doc.title}`} className="max-h-[60dvh] w-full object-contain" />
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => download()}>Descargar</Button>
      </div>

      <section className="grid gap-4">
        <Field label="Nombre del documento" htmlFor="d-title">
          <div className="flex flex-wrap gap-2">
            <Input id="d-title" className="min-w-0 flex-1" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            <Button variant="secondary" onClick={rename} disabled={!title.trim() || title.trim() === doc.title}>Guardar nombre</Button>
          </div>
        </Field>
        <Field label="Caso" htmlFor="d-case">
          <Select id="d-case" value={doc.case_id ?? ""} onChange={(e) => changeCase(e.target.value)}>
            <option value="">Sin caso (general)</option>
            {cases.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </Select>
        </Field>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-field)] border border-line-strong bg-surface px-4">
          <input
            type="checkbox"
            className="size-6 accent-[var(--accent)]"
            checked={doc.shared_with_client}
            disabled={!doc.case_id}
            onChange={(e) => toggleShare(e.target.checked)}
          />
          <span>
            Compartir con el cliente en su portal
            {!doc.case_id && <span className="block text-[length:var(--text-body-sm)] text-ink-3">Primero asocie el documento a un caso.</span>}
          </span>
        </label>
      </section>

      <section className="grid gap-3">
        <h3 className="text-[length:var(--text-subheading)] font-semibold">Subir nueva versión</h3>
        <FileDrop file={newFile} onFile={(f) => { setNewFile(f); setError(null); }} disabled={busy} />
        <Field label="Nota de la versión (opcional)">
          <TextWithDictation value={note} onChange={setNote} placeholder="Qué cambió en esta versión" maxLength={1000} />
        </Field>
        <p role="alert" aria-live="polite" className="text-danger empty:hidden">{error}</p>
        <div>
          <Button variant="secondary" onClick={uploadVersion} disabled={busy || !newFile}>
            {busy ? "Subiendo…" : "Guardar nueva versión"}
          </Button>
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="text-[length:var(--text-subheading)] font-semibold">Versiones</h3>
        {!versions ? (
          <p className="text-ink-2">Cargando…</p>
        ) : (
          <ul className="grid gap-3">
            {versions.map((v) => (
              <li key={v.version} className="grid gap-2 rounded-[var(--radius-card)] border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={v.version === doc.current_version ? "ok" : "neutral"}>
                    v{v.version}{v.version === doc.current_version ? " · actual" : ""}
                  </Pill>
                  <span className="text-ink-2">{fmtDateTime(v.created_at)}{v.author ? ` · ${v.author}` : ""}</span>
                </div>
                {v.note && <p>{v.note}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => download(v.version)}>Descargar</Button>
                  {v.version !== doc.current_version && (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => restore(v.version)}>Restaurar esta versión</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="border-t border-line pt-4">
        <Button variant="danger" onClick={remove}>Eliminar documento</Button>
      </div>
    </div>
  );
}
