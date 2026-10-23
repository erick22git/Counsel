"use client";
import * as React from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCEPT_ATTR, ALLOWED_LABEL, formatBytes } from "@/lib/documentos/files";
import { cn } from "@/lib/utils";

/** Zona de arrastrar y soltar + botón grande "Elegir archivo". */
export function FileDrop({ file, onFile, disabled }: { file: File | null; onFile: (f: File) => void; disabled?: boolean }) {
  const [over, setOver] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f && !disabled) onFile(f);
      }}
      className={cn(
        "grid justify-items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed px-4 py-8 text-center transition-colors duration-150",
        over ? "border-accent bg-accent-soft" : "border-line-strong bg-surface-2"
      )}
    >
      <Upload size={28} aria-hidden className="text-ink-2" />
      {file ? (
        <p className="font-medium break-all">
          {file.name} <span className="font-normal text-ink-2">({formatBytes(file.size)})</span>
        </p>
      ) : (
        <p className="text-ink-2">Arrastre aquí su archivo</p>
      )}
      <Button variant="outline" size="lg" className="text-[1.15rem]" disabled={disabled} onClick={() => input.current?.click()}>
        {file ? "Elegir otro archivo" : "Elegir archivo"}
      </Button>
      <p className="text-[length:var(--text-body-sm)] text-ink-3">{ALLOWED_LABEL}. Máximo 25 MB.</p>
      <input
        ref={input}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        aria-label="Elegir archivo"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
