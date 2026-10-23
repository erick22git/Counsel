"use client";
import { usePathname, useRouter } from "next/navigation";
import { Field, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const ESTADOS = [
  ["borrador", "Borrador"],
  ["enviada", "Enviada"],
  ["vencida", "Vencida"],
  ["pagada", "Pagada"],
  ["anulada", "Anulada"],
];

export function InvoiceFilters({ clients, estado, cliente }: { clients: { id: string; full_name: string }[]; estado: string; cliente: string }) {
  const router = useRouter();
  const path = usePathname();
  const go = (next: { estado?: string; cliente?: string }) => {
    const q = new URLSearchParams();
    const e = next.estado ?? estado;
    const c = next.cliente ?? cliente;
    if (e) q.set("estado", e);
    if (c) q.set("cliente", c);
    router.replace(q.size ? `${path}?${q}` : path);
  };
  return (
    <div className="mt-6 flex flex-wrap items-end gap-4">
      <Field label="Estado" htmlFor="f-estado" className="min-w-48">
        <Select id="f-estado" value={estado} onChange={(e) => go({ estado: e.target.value })}>
          <option value="">Todos</option>
          {ESTADOS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </Select>
      </Field>
      <Field label="Cliente" htmlFor="f-cliente" className="min-w-56">
        <Select id="f-cliente" value={cliente} onChange={(e) => go({ cliente: e.target.value })}>
          <option value="">Todos</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </Select>
      </Field>
      {(estado || cliente) && (
        <Button variant="ghost" onClick={() => router.replace(path)}>Quitar filtros</Button>
      )}
    </div>
  );
}
