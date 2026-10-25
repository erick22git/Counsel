import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildHref, pageMeta, PAGE_SIZE } from "@/lib/paginacion/params";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Paginación por enlaces (funciona sin JavaScript). Conserva `params` (búsqueda, filtros…)
 * y solo cambia el número de página.
 */
export function Paginacion({
  total,
  page,
  pageSize = PAGE_SIZE,
  basePath,
  params = {},
  pageParam = "pagina",
  noun = "resultados",
  className,
}: {
  total: number;
  page: number;
  pageSize?: number;
  basePath: string;
  params?: Record<string, string | undefined | null>;
  pageParam?: string;
  /** Texto para el conteo: "clientes", "casos"… */
  noun?: string;
  className?: string;
}) {
  const m = pageMeta(total, page, pageSize);
  if (m.total <= m.pageSize) return null;
  const from = (m.page - 1) * m.pageSize + 1;
  const to = Math.min(m.total, m.page * m.pageSize);
  const href = (p: number) => buildHref(basePath, params, p, pageParam);
  const btn = buttonVariants({ variant: "outline", size: "sm" });
  const off = "pointer-events-none opacity-50";
  return (
    <nav aria-label="Paginación" className={cn("mt-6 flex flex-wrap items-center justify-between gap-3", className)}>
      <p className="text-ink-2" aria-live="polite">
        Página {m.page} de {m.totalPages} <span className="text-ink-3">· {from}–{to} de {m.total} {noun}</span>
      </p>
      <div className="flex items-center gap-3">
        {m.page > 1 ? (
          <Link href={href(m.page - 1)} rel="prev" className={cn(btn, "min-w-28")}>
            <ChevronLeft size={18} aria-hidden /> Anterior
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(btn, "min-w-28", off)}>
            <ChevronLeft size={18} aria-hidden /> Anterior
          </span>
        )}
        {m.page < m.totalPages ? (
          <Link href={href(m.page + 1)} rel="next" className={cn(btn, "min-w-28")}>
            Siguiente <ChevronRight size={18} aria-hidden />
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(btn, "min-w-28", off)}>
            Siguiente <ChevronRight size={18} aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
