"use client";
import * as React from "react";
import Link from "next/link";
import { useEditor, EditorContent, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Underline, Heading1, Heading2, List, ListOrdered, Undo2, Redo2, Printer, FileDown, History, Save, Eraser, BookmarkPlus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/field";
import { Card, Pill } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TextWithDictation } from "@/components/ui/text-with-dictation";
import { DictationButton } from "@/components/dictation/dictation-button";
import { ImproveButton } from "@/components/ai/improve-button";
import { ok, fail } from "@/components/ui/undo-toast";
import { saveEscrito, saveVersion, restoreVersion } from "@/app/(app)/escritos/actions";
import { VarMark } from "@/lib/editor/var-mark";
import { buildWordDoc, safeFileName } from "@/lib/editor/export";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SaveAsTemplateDialog } from "./save-as-template-dialog";

export interface VersionRow { version: number; note: string | null; created_at: string }
export interface CaseOption { id: string; title: string; case_number: string | null }

type SaveState = "saved" | "dirty" | "saving" | "error";

const AUTOSAVE_MS = 1500;

export function EscritoEditor({
  id,
  initialTitle,
  initialHtml,
  initialCaseId,
  initialVersion,
  versions: initialVersions,
  cases,
}: {
  id: string;
  initialTitle: string;
  initialHtml: string;
  initialCaseId: string | null;
  initialVersion: number;
  versions: VersionRow[];
  cases: CaseOption[];
}) {
  const [title, setTitle] = React.useState(initialTitle);
  const [caseId, setCaseId] = React.useState(initialCaseId ?? "");
  const [state, setState] = React.useState<SaveState>("saved");
  const [versions, setVersions] = React.useState(initialVersions);
  const [current, setCurrent] = React.useState(initialVersion);
  const [showVersions, setShowVersions] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [viewing, setViewing] = React.useState<{ version: number; html: string } | null>(null);
  const [tplOpen, setTplOpen] = React.useState(false);

  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = React.useRef({ title, caseId });
  React.useEffect(() => {
    latest.current = { title, caseId };
  }, [title, caseId]);

  const editor = useEditor({
    // StarterKit v3 ya incluye Underline y Link: no se duplican.
    extensions: [StarterKit.configure({ heading: { levels: [1, 2] } }), Placeholder.configure({ placeholder: "Escribe aquí tu escrito…" }), VarMark],
    content: initialHtml || "<p></p>",
    immediatelyRender: false,
    editorProps: { attributes: { "aria-label": "Texto del escrito", class: "ProseMirror" } },
    onUpdate: () => schedule(),
  });

  const persist = React.useCallback(async () => {
    if (!editor) return;
    setState("saving");
    const { title: t, caseId: c } = latest.current;
    const r = await saveEscrito({ id, html: editor.getHTML(), title: t.trim() || "Escrito sin título", caseId: c || null, setCase: true });
    setState(r.ok ? "saved" : "error");
    if (!r.ok) fail(r.error);
  }, [editor, id]);

  function schedule() {
    setState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(), AUTOSAVE_MS);
  }

  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Avisar si hay cambios sin guardar al cerrar la pestaña.
  React.useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (state === "dirty" || state === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [state]);

  async function onSaveVersion() {
    if (!editor) return;
    setBusy(true);
    if (timer.current) clearTimeout(timer.current);
    const r = await saveVersion({ id, html: editor.getHTML(), note: note || undefined });
    setBusy(false);
    if (!r.ok) return fail(r.error);
    setCurrent(r.version);
    setVersions((v) => [{ version: r.version, note: note || null, created_at: new Date().toISOString() }, ...v]);
    setNote("");
    setState("saved");
    ok(`Versión ${r.version} guardada`);
  }

  async function onRestore(version: number) {
    if (!editor) return;
    setBusy(true);
    const r = await restoreVersion({ id, version });
    setBusy(false);
    if (!r.ok) return fail(r.error);
    editor.commands.setContent(r.html || "<p></p>", { emitUpdate: false });
    setCurrent(r.version);
    setVersions((v) => [{ version: r.version, note: `Restaurada desde la versión ${version}`, created_at: new Date().toISOString() }, ...v]);
    setViewing(null);
    ok(`Se restauró la versión ${version} como versión nueva`);
  }

  function downloadWord() {
    if (!editor) return;
    const blob = new Blob(["﻿", buildWordDoc(title, editor.getHTML())], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileName(title)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statusText = { saved: "Guardado hace un momento", dirty: "Cambios sin guardar…", saving: "Guardando…", error: "No se pudo guardar" }[state];

  return (
    <div>
      <style>{PRINT_CSS}</style>

      <div className="no-print mb-4">
        <Link href="/escritos" className="press inline-flex min-h-11 items-center gap-2 text-ink-2 hover:text-ink">
          <ArrowLeft size={18} aria-hidden /> Volver a mis escritos
        </Link>
      </div>

      <Card className="no-print mb-4 grid gap-4 md:grid-cols-[1fr_20rem]">
        <Field label="Título del escrito" htmlFor="esc-titulo">
          <Input
            id="esc-titulo"
            value={title}
            onChange={(e) => { setTitle(e.target.value); schedule(); }}
            maxLength={200}
          />
        </Field>
        <Field label="Caso asociado" htmlFor="esc-caso">
          <Select id="esc-caso" value={caseId} onChange={(e) => { setCaseId(e.target.value); schedule(); }}>
            <option value="">Sin caso</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.case_number ? `${c.case_number} · ` : ""}{c.title}</option>
            ))}
          </Select>
        </Field>
      </Card>

      <div className="no-print sticky top-14 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-2" role="toolbar" aria-label="Herramientas de texto">
        <Toolbar editor={editor} />
        <span className="mx-1 hidden h-8 w-px bg-line md:block" aria-hidden />
        <DictationButton onText={(t) => editor?.chain().focus().insertContent(t).run()} />
        <ImproveButton
          getText={() => {
            if (!editor) return "";
            const { from, to } = editor.state.selection;
            return from !== to ? editor.state.doc.textBetween(from, to, "\n") : "";
          }}
          onAccept={(t) => {
            const esc = (x: string) => x.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
            const html = t.split(/\n{2,}/).map((x) => `<p>${esc(x).replace(/\n/g, "<br>")}</p>`).join("");
            editor?.chain().focus().insertContent(html).run();
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="sheet legal-doc mx-auto max-w-[52rem] rounded-[var(--radius-card)] border border-line bg-surface px-6 py-8 md:px-14 md:py-12">
            <EditorContent editor={editor} />
          </div>
        </div>

        {showVersions && (
          <aside aria-label="Versiones" className="no-print w-full lg:w-80">
            <Card className="grid gap-4">
              <h2 className="text-[length:var(--text-heading-sm)]">Versiones</h2>
              <p className="text-ink-2">Una versión es una copia que puedes recuperar después. Ahora estás en la versión {current}.</p>
              <ul className="grid gap-3">
                {versions.map((v) => (
                  <li key={v.version} className="grid gap-2 rounded-lg border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>Versión {v.version}</strong>
                      {v.version === current && <Pill tone="ok">Actual</Pill>}
                    </div>
                    <span className="text-[length:var(--text-body-sm)] text-ink-3">{fmtDateTime(v.created_at)}</span>
                    {v.note && <span className="text-ink-2">{v.note}</span>}
                    <div className="flex flex-wrap gap-2">
                      <ViewButton id={id} version={v.version} onLoaded={(html) => setViewing({ version: v.version, html })} />
                      {v.version !== current && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => onRestore(v.version)}>Restaurar</Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        )}
      </div>

      <div className="no-print mt-6 grid gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span role="status" aria-live="polite" className={cn("font-medium", state === "error" ? "text-danger" : "text-ink-2")}>{statusText}</span>
        </div>
        <Field label="Nota de la versión (opcional)" htmlFor="esc-nota" hint="Por ejemplo: “Primer borrador para el cliente”.">
          <TextWithDictation id="esc-nota" value={note} onChange={setNote} rows={2} maxLength={500} />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={onSaveVersion} disabled={busy || !editor}>
            <Save size={20} aria-hidden /> Guardar versión
          </Button>
          <Button variant="outline" onClick={() => setShowVersions((s) => !s)} aria-expanded={showVersions}>
            <History size={20} aria-hidden /> Versiones ({versions.length})
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={20} aria-hidden /> Imprimir / guardar PDF
          </Button>
          <Button variant="outline" onClick={downloadWord}>
            <FileDown size={20} aria-hidden /> Descargar para Word
          </Button>
          <Button variant="outline" onClick={() => setTplOpen(true)}>
            <BookmarkPlus size={20} aria-hidden /> Guardar como plantilla
          </Button>
        </div>
      </div>

      <SaveAsTemplateDialog open={tplOpen} onOpenChange={setTplOpen} defaultTitle={title} getHtml={() => editor?.getHTML() ?? ""} />

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent title={`Versión ${viewing?.version ?? ""} (solo lectura)`} description="Así estaba el escrito en ese momento." className="w-[min(94vw,52rem)]">
          {viewing && <ReadOnlyDoc html={viewing.html} />}
          <div className="mt-4 flex flex-wrap gap-3">
            {viewing && viewing.version !== current && (
              <Button variant="outline" disabled={busy} onClick={() => onRestore(viewing.version)}>Restaurar esta versión</Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ViewButton({ id, version, onLoaded }: { id: string; version: number; onLoaded: (html: string) => void }) {
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const { createClient } = await import("@/lib/supabase/client");
        const { data, error } = await createClient().from("document_versions").select("content_html").eq("document_id", id).eq("version", version).maybeSingle();
        setLoading(false);
        if (error || !data) return fail("No se pudo abrir esa versión.");
        onLoaded(data.content_html ?? "");
      }}
    >
      Ver
    </Button>
  );
}

/** Solo lectura: pasa por el esquema de Tiptap, que descarta cualquier HTML no permitido. */
function ReadOnlyDoc({ html }: { html: string }) {
  const ed = useEditor({ extensions: [StarterKit, VarMark], content: html || "<p></p>", editable: false, immediatelyRender: false });
  return (
    <div className="legal-doc rounded-lg border border-line bg-canvas px-6 py-6">
      <EditorContent editor={ed} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"),
            h1: e.isActive("heading", { level: 1 }), h2: e.isActive("heading", { level: 2 }),
            ul: e.isActive("bulletList"), ol: e.isActive("orderedList"),
            canUndo: e.can().undo(), canRedo: e.can().redo(),
          }
        : null,
  });
  if (!editor || !s) return <span className="px-3 text-ink-3">Cargando herramientas…</span>;
  const c = () => editor.chain().focus();
  return (
    <>
      <TBtn label="Negrita" on={s.bold} onClick={() => c().toggleBold().run()} icon={<Bold size={18} aria-hidden />} />
      <TBtn label="Cursiva" on={s.italic} onClick={() => c().toggleItalic().run()} icon={<Italic size={18} aria-hidden />} />
      <TBtn label="Subrayado" on={s.underline} onClick={() => c().toggleUnderline().run()} icon={<Underline size={18} aria-hidden />} />
      <TBtn label="Título" on={s.h1} onClick={() => c().toggleHeading({ level: 1 }).run()} icon={<Heading1 size={18} aria-hidden />} />
      <TBtn label="Subtítulo" on={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()} icon={<Heading2 size={18} aria-hidden />} />
      <TBtn label="Lista" on={s.ul} onClick={() => c().toggleBulletList().run()} icon={<List size={18} aria-hidden />} />
      <TBtn label="Lista numerada" on={s.ol} onClick={() => c().toggleOrderedList().run()} icon={<ListOrdered size={18} aria-hidden />} />
      <TBtn label="Quitar marca amarilla" on={false} onClick={() => c().extendMarkRange("templateVar").unsetMark("templateVar").run()} icon={<Eraser size={18} aria-hidden />} />
      <TBtn label="Deshacer" on={false} disabled={!s.canUndo} onClick={() => c().undo().run()} icon={<Undo2 size={18} aria-hidden />} />
      <TBtn label="Rehacer" on={false} disabled={!s.canRedo} onClick={() => c().redo().run()} icon={<Redo2 size={18} aria-hidden />} />
    </>
  );
}

function TBtn({ label, icon, on, onClick, disabled }: { label: string; icon: React.ReactNode; on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={cn(
        "press inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-[length:var(--text-body-sm)] font-medium disabled:cursor-default disabled:opacity-40",
        on ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface-2"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

const PRINT_CSS = `
@media print {
  main#contenido { padding: 0 !important; max-width: none !important; }
  .sheet { border: 0 !important; padding: 0 !important; max-width: none !important; background: white !important; }
  .sheet, .sheet * { color: black !important; }
  .legal-doc mark.var { background: none !important; }
}
`;
