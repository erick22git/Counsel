"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Mail, Phone, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BuscadorLista } from "@/components/paginacion/buscador-lista";
import { Paginacion } from "@/components/paginacion/paginacion";
import { ClienteDialog } from "@/components/clientes/cliente-dialog";
import type { Client } from "@/lib/db/types";

export function ClientesView({
  clients: list, caseCounts, initialOpen, q = "", total = list.length, page = 1, pageSize = 25,
}: {
  clients: Client[];
  caseCounts: Record<string, number>;
  initialOpen: boolean;
  /** Búsqueda ya aplicada en el servidor. */
  q?: string;
  total?: number;
  page?: number;
  pageSize?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(initialOpen);

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (!o && initialOpen) router.replace("/clientes");
  }

  const newButton = (
    <Button variant="primary" onClick={() => setOpen(true)}>
      <Plus size={20} aria-hidden /> Nuevo cliente
    </Button>
  );

  return (
    <>
      <PageHeader title="Clientes" subtitle="Las personas y empresas a las que atiendes." action={total > 0 || q ? newButton : undefined} />

      {total === 0 && !q ? (
        <EmptyState
          title="Aún no tienes clientes"
          description="Registra a tu primer cliente con su nombre y teléfono. Luego podrás abrirle casos."
          action={newButton}
        />
      ) : (
        <>
          <BuscadorLista basePath="/clientes" q={q} id="buscar-cliente" label="Buscar cliente" placeholder="Buscar por nombre, CI o NIT" clearHref="/clientes" />
          <p className="sr-only" aria-live="polite">{total} clientes encontrados</p>
          {list.length === 0 ? (
            <Card className="text-center text-ink-2">No encontramos ningún cliente con “{q}”. Prueba con otro nombre o con el número de CI/NIT.</Card>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((c) => {
                const n = caseCounts[c.id] ?? 0;
                return (
                  <li key={c.id}>
                    <Card className="flex h-full flex-col gap-3 p-5">
                      <div className="flex items-start gap-3">
                        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-sand text-ink">
                          {c.kind === "empresa" ? <Building2 size={22} /> : <User size={22} />}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/clientes/${c.id}`} className="block break-words font-semibold text-ink hover:text-accent focus-visible:outline-2 focus-visible:outline-accent">
                            {c.full_name}
                          </Link>
                          <p className="text-[length:var(--text-body-sm)] text-ink-2">
                            {c.kind === "empresa" ? "Empresa" : "Persona"}{c.ci_nit ? ` · ${c.kind === "empresa" ? "NIT" : "CI"} ${c.ci_nit}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-1 text-[length:var(--text-body-sm)] text-ink-2">
                        {c.phone && <span className="inline-flex items-center gap-2"><Phone size={16} aria-hidden /> {c.phone}</span>}
                        {c.email && <span className="inline-flex items-center gap-2 break-all"><Mail size={16} aria-hidden /> {c.email}</span>}
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                        <Pill tone={n ? "accent" : "neutral"}>{n === 1 ? "1 caso" : `${n} casos`}</Pill>
                        <Button asChild variant="outline" size="sm"><Link href={`/clientes/${c.id}`}>Ver ficha</Link></Button>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
          <Paginacion total={total} page={page} pageSize={pageSize} basePath="/clientes" params={{ q }} noun="clientes" />
        </>
      )}
      <ClienteDialog open={open} onOpenChange={onOpenChange} onSaved={(id) => router.push(`/clientes/${id}`)} />
    </>
  );
}
