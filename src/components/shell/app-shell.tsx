"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Sparkles, MoreHorizontal, LogOut } from "lucide-react";
import { NAV as ALL_NAV } from "./nav";
import { CommandPalette } from "./command-palette";
import { AiPanel } from "@/components/ai/ai-panel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/(auth)/actions";

export function AppShell({ firmName, userName, role, children }: { firmName: string; userName: string; role?: string; children: React.ReactNode }) {
  // El asistente no tiene acceso a cobros ni tiempo (RLS): se oculta para no mostrar pantallas vacías.
  const NAV = ALL_NAV.filter((n) => !(role === "assistant" && (n.href === "/cobros" || n.href === "/tiempo")));
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [aiOpen, setAiOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  React.useEffect(() => {
    const open = () => setAiOpen(true);
    window.addEventListener("counsel:open-ai", open);
    return () => window.removeEventListener("counsel:open-ai", open);
  }, []);
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[17rem_1fr]">
      {/* Barra lateral (escritorio) */}
      <nav aria-label="Principal" className="no-print sticky top-0 hidden h-dvh flex-col border-r border-line bg-canvas p-4 md:flex">
        <div className="px-3 pb-5 pt-2">
          <p className="text-[length:var(--text-heading-sm)] font-semibold tracking-tight">Counsel</p>
          <p className="truncate text-[length:var(--text-body-sm)] text-ink-3">{firmName}</p>
        </div>
        <ul className="grid gap-1">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active(n.href) ? "page" : undefined}
                className={cn(
                  "press flex min-h-11 items-center gap-3 rounded-[var(--radius-btn)] px-3 text-ink-2 hover:bg-surface-2 hover:text-ink",
                  active(n.href) && "bg-surface text-ink font-medium border border-line"
                )}
              >
                <n.icon size={20} aria-hidden /> {n.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-auto grid gap-2 border-t border-line pt-4">
          <p className="truncate px-3 text-[length:var(--text-body-sm)] text-ink-2">{userName}</p>
          <form action={signOut}>
            <button className="press flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[var(--radius-btn)] px-3 text-ink-2 hover:bg-surface-2">
              <LogOut size={20} aria-hidden /> Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      <div className="min-w-0 pb-24 md:pb-0">
        {/* Barra superior: buscar + asistente */}
        <div className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur-0 md:px-8">
          <button
            onClick={() => setPaletteOpen(true)}
            className="press flex min-h-11 flex-1 cursor-pointer items-center gap-3 rounded-full border border-line-strong bg-surface px-4 text-left text-ink-3 md:max-w-md"
          >
            <Search size={18} aria-hidden /> <span className="truncate">Buscar un caso, cliente o acción</span>
            <kbd className="ml-auto hidden rounded border border-line px-1.5 text-[0.75rem] md:inline">Ctrl K</kbd>
          </button>
          <button
            onClick={() => setAiOpen((o) => !o)}
            aria-expanded={aiOpen}
            className="press flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-accent-soft px-4 font-medium text-accent"
          >
            <Sparkles size={18} aria-hidden /> Asistente
          </button>
        </div>
        <main id="contenido" className={cn("mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8 transition-[padding] duration-200", aiOpen && "lg:pr-[27rem]")}>
          {children}
        </main>
      </div>

      {/* Barra inferior (móvil) */}
      <nav aria-label="Principal" className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-canvas md:hidden">
        {NAV.filter((n) => n.primary).map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active(n.href) ? "page" : undefined}
            className={cn("press flex min-h-16 flex-col items-center justify-center gap-0.5 text-[0.78rem] text-ink-2", active(n.href) && "font-semibold text-accent")}
          >
            <n.icon size={22} aria-hidden /> {n.label}
          </Link>
        ))}
        <button onClick={() => setMoreOpen(true)} className="press flex min-h-16 cursor-pointer flex-col items-center justify-center gap-0.5 text-[0.78rem] text-ink-2">
          <MoreHorizontal size={22} aria-hidden /> Más
        </button>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent title="Más opciones">
          <ul className="grid gap-1">
            {NAV.filter((n) => !n.primary).map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setMoreOpen(false)} className="press flex min-h-12 items-center gap-3 rounded-lg px-3 hover:bg-surface-2">
                  <n.icon size={20} aria-hidden /> {n.label}
                </Link>
              </li>
            ))}
            <li>
              <form action={signOut}>
                <button className="press flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left hover:bg-surface-2">
                  <LogOut size={20} aria-hidden /> Cerrar sesión
                </button>
              </form>
            </li>
          </ul>
        </DialogContent>
      </Dialog>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onOpenAi={() => setAiOpen(true)} />
      <AiPanel open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
