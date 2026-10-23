"use client";
import * as React from "react";
import Link from "next/link";
import { FileText, PenLine } from "lucide-react";
import { Card, Pill } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { fmtDate } from "@/lib/format";
import { TIPO_LABEL, docTipo, formatBytes } from "@/lib/documentos/files";
import type { Doc } from "@/lib/db/types";
import { DocumentDetail } from "./document-detail";
import type { CaseOption } from "./upload-dialog";

export interface DocRow extends Doc {
  case_label: string | null;
}

export function DocumentList({ docs, firmId, cases }: { docs: DocRow[]; firmId: string; cases: CaseOption[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const current = docs.find((d) => d.id === openId) ?? null;

  return (
    <>
      <ul className="grid gap-3">
        {docs.map((d) => {
          const escrito = d.kind === "escrito";
          const inner = (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-lg bg-sand text-ink">
                {escrito ? <PenLine size={22} /> : <FileText size={22} />}
              </span>
              <div className="min-w-0 flex-1 basis-60">
                <p className="truncate font-medium">{d.title}</p>
                <p className="truncate text-ink-2">{d.case_label ?? "Documento general"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {escrito ? <Pill tone="accent">Escrito</Pill> : <Pill>{TIPO_LABEL[docTipo(d)]}</Pill>}
                {!escrito && <Pill tone="accent">v{d.current_version}</Pill>}
                {d.shared_with_client && <Pill tone="ok">Compartido con el cliente</Pill>}
              </div>
              <p className="text-ink-2 sm:w-40 sm:text-right">
                {!escrito && <span>{formatBytes(d.size_bytes)} · </span>}
                {fmtDate(d.updated_at)}
              </p>
            </div>
          );
          return (
            <li key={d.id}>
              <Card className="p-0 transition-colors duration-150 hover:bg-surface-2">
                {escrito ? (
                  <Link href={`/escritos/${d.id}`} className="block rounded-[var(--radius-card)] p-4 min-h-14" aria-label={`Abrir escrito ${d.title}`}>
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpenId(d.id)}
                    className="block w-full cursor-pointer rounded-[var(--radius-card)] p-4 text-left min-h-14"
                    aria-label={`Ver detalle de ${d.title}`}
                  >
                    {inner}
                  </button>
                )}
              </Card>
            </li>
          );
        })}
      </ul>

      <Dialog open={!!current} onOpenChange={(v) => !v && setOpenId(null)}>
        {current && (
          <DialogContent title={current.title} description={current.case_label ?? "Documento general"} className="w-[min(94vw,46rem)]">
            <DocumentDetail doc={current} firmId={firmId} cases={cases} onClose={() => setOpenId(null)} />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
