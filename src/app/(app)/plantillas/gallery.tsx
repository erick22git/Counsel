"use client";
import * as React from "react";
import { FileText, Search } from "lucide-react";
import { Card, Pill } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { TemplateFillDialog, type FillCase, type FillClient } from "@/components/editor/template-fill-dialog";
import { TEMPLATE_CATEGORIES } from "@/lib/editor/categories";
import type { Template } from "@/lib/db/types";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Gallery({ templates, clients, cases }: { templates: Template[]; clients: FillClient[]; cases: FillCase[] }) {
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Template | null>(null);
  const [open, setOpen] = React.useState(false);

  const filtered = templates.filter((t) => !q.trim() || norm(`${t.title} ${t.description ?? ""} ${t.category}`).includes(norm(q.trim())));
  const known = new Set<string>(TEMPLATE_CATEGORIES);
  const cats = [...TEMPLATE_CATEGORIES, ...[...new Set(filtered.map((t) => t.category))].filter((c) => !known.has(c))];

  return (
    <div className="grid gap-8">
      <Field label="Buscar plantilla" htmlFor="pl-buscar">
        <div className="relative max-w-xl">
          <Search size={20} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input id="pl-buscar" type="search" className="pl-12" placeholder="Por ejemplo: poder, divorcio, arrendamiento" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Field>

      {filtered.length === 0 && (
        <EmptyState title="No encontramos esa plantilla" description="Prueba con otra palabra, por ejemplo “contrato” o “memorial”." action={<Button variant="secondary" onClick={() => setQ("")}>Ver todas</Button>} />
      )}

      {cats.map((cat) => {
        const items = filtered.filter((t) => t.category === cat);
        if (!items.length) return null;
        return (
          <section key={cat} aria-labelledby={`cat-${cat}`}>
            <h2 id={`cat-${cat}`} className="mb-3 text-[length:var(--text-heading-sm)]">{cat} <span className="text-ink-3">({items.length})</span></h2>
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
