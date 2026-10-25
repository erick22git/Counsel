"use client";
import * as React from "react";
import { FileText } from "lucide-react";
import { Card, Pill } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BuscadorLista } from "@/components/paginacion/buscador-lista";
import { EmptyState } from "@/components/ui/empty-state";
import { TemplateFillDialog, type FillCase, type FillClient } from "@/components/editor/template-fill-dialog";
import { TEMPLATE_CATEGORIES } from "@/lib/editor/categories";
import type { Template } from "@/lib/db/types";

export function Gallery({
  templates, clients, cases, q = "", total = templates.length,
}: { templates: Template[]; clients: FillClient[]; cases: FillCase[]; q?: string; total?: number }) {
  const [selected, setSelected] = React.useState<Template | null>(null);
  const [open, setOpen] = React.useState(false);

  const filtered = templates; // la búsqueda y la página se resuelven en el servidor
  const partial = total > templates.length; // hay más páginas: el conteo por categoría sería parcial
  const known = new Set<string>(TEMPLATE_CATEGORIES);
  const cats = [...TEMPLATE_CATEGORIES, ...[...new Set(filtered.map((t) => t.category))].filter((c) => !known.has(c))];

  return (
    <div className="grid gap-8">
      <BuscadorLista basePath="/plantillas" q={q} id="pl-buscar" label="Buscar plantilla" placeholder="Por ejemplo: poder, divorcio, arrendamiento" clearHref="/plantillas" className="mb-0" />

      {filtered.length === 0 && (
        <EmptyState title="No encontramos esa plantilla" description="Prueba con otra palabra, por ejemplo “contrato” o “memorial”." action={<Button asChild variant="secondary"><Link href="/plantillas">Ver todas</Link></Button>} />
      )}

      {cats.map((cat) => {
        const items = filtered.filter((t) => t.category === cat);
        if (!items.length) return null;
        return (
          <section key={cat} aria-labelledby={`cat-${cat}`}>
            <h2 id={`cat-${cat}`} className="mb-3 text-[length:var(--text-heading-sm)]">{cat} {!partial && <span className="text-ink-3">({items.length})</span>}</h2>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((t) => (
                <li key={t.id}>
                  <Card className="flex h-full flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <FileText size={22} aria-hidden className="mt-1 shrink-0 text-ink-3" />
                      <div>
                        <h3 className="text-[length:var(--text-subheading)] font-semibold">{t.title}</h3>
                        {t.description && <p className="mt-1 text-ink-2">{t.description}</p>}
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-3">
                      <Button variant="secondary" onClick={() => { setSelected(t); setOpen(true); }}>Usar esta plantilla</Button>
                      {t.firm_id && <Pill tone="accent">De tu despacho</Pill>}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <TemplateFillDialog template={selected} open={open} onOpenChange={setOpen} clients={clients} cases={cases} />
    </div>
  );
}
