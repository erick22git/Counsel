import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * Buscador de listas: formulario GET (sin JavaScript, la búsqueda queda en la URL y se puede compartir).
 * `params` se reenvía como campos ocultos para conservar otros filtros; la página vuelve a 1.
 * `children` permite agregar filtros propios (selectores con `name`).
 */
export function BuscadorLista({
  basePath,
  q,
  params = {},
  label = "Buscar",
  placeholder,
  id = "buscar-lista",
  clearHref,
  active: activeProp,
  children,
  className,
}: {
  basePath: string;
  q: string;
  /** Otros parámetros de la URL a conservar (vacíos se omiten). */
  params?: Record<string, string | undefined | null>;
  label?: string;
  placeholder?: string;
  id?: string;
  /** Si se indica, aparece "Quitar filtros" cuando hay búsqueda o filtros activos. */
  clearHref?: string;
  /** Fuerza el estado "hay filtros" (útil cuando los filtros son campos de `children`). */
  active?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const active = activeProp ?? (Boolean(q) || Object.values(params).some(Boolean));
  return (
    <form method="get" action={basePath} role="search" aria-label={label} className={cn("mb-5 flex flex-wrap items-end gap-3", className)}>
      {Object.entries(params).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <div className="grid min-w-60 flex-1 gap-1.5 sm:max-w-md">
        <label htmlFor={id} className="font-medium">{label}</label>
        <div className="relative">
          <Search aria-hidden size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input key={q} id={id} name="q" type="search" defaultValue={q} placeholder={placeholder} className="pl-12" autoComplete="off" maxLength={80} />
        </div>
      </div>
      {children}
      <div className="flex items-center gap-2">
        <Button type="submit" variant="outline">Buscar</Button>
        {clearHref && active && (
          <Button asChild variant="ghost"><Link href={clearHref}>Quitar filtros</Link></Button>
        )}
      </div>
    </form>
  );
}
