"use client";
import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Search, Plus, Sparkles, Moon, Sun } from "lucide-react";
import { NAV } from "./nav";
import { usePrefs } from "./prefs-provider";

interface Hit { id: string; label: string; sub?: string; href: string; group: string }

/** Cmd/Ctrl+K — opcional: todo lo que hace está también en la navegación normal. */
export function CommandPalette({ open, onOpenChange, onOpenAi }: { open: boolean; onOpenChange: (o: boolean) => void; onOpenAi: () => void }) {
  const router = useRouter();
  const { prefs, setPref } = usePrefs();
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<Hit[]>([]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (q.trim().length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/buscar?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal });
        if (r.ok) setHits((await r.json()).results ?? []);
      } catch {}
    }, 160);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  const go = (href: string) => {
    onOpenChange(false);
    setQ("");
    router.push(href);
  };

  if (!open) return null;
  const shown = q.trim().length >= 2 ? hits : [];
  const groups = Array.from(new Set(shown.map((h) => h.group)));

  return (
    <div className="fixed inset-0 z-[60] grid place-items-start justify-items-center bg-black/40 px-4 pt-[12vh] fade-in" onMouseDown={() => onOpenChange(false)}>
      <Command
        label="Buscar o ir a…"
        shouldFilter={true}
        onMouseDown={(e) => e.stopPropagation()}
        className="enter w-[min(92vw,38rem)] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[0_6px_10px_rgba(0,0,0,.04),0_2px_4px_rgba(0,0,0,.04)]"
        onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={20} aria-hidden className="text-ink-3" />
          <Command.Input
            autoFocus
            value={q}
            onValueChange={setQ}
            placeholder="Escribe un caso, cliente o acción…"
            className="min-h-14 w-full bg-transparent text-[1rem] outline-none placeholder:text-ink-3"
          />
        </div>
        <Command.List className="max-h-[50vh] overflow-y-auto p-2">
          <Command.Empty className="p-4 text-ink-2">No encontré nada. Prueba con otra palabra.</Command.Empty>

          {groups.map((g) => (
            <Command.Group key={g} heading={g} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[length:var(--text-body-sm)] [&_[cmdk-group-heading]]:text-ink-3">
              {shown.filter((h) => h.group === g).map((h) => (
                <Item key={h.id} value={`${h.label} ${h.sub ?? ""} ${q}`} onSelect={() => go(h.href)}>
                  <span>{h.label}</span>
                  {h.sub && <span className="text-ink-3"> · {h.sub}</span>}
                </Item>
              ))}
            </Command.Group>
          ))}

          <Command.Group heading="Crear" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[length:var(--text-body-sm)] [&_[cmdk-group-heading]]:text-ink-3">
            <Item value="nuevo caso" onSelect={() => go("/casos?nuevo=1")}><Plus size={18} aria-hidden /> Nuevo caso</Item>
            <Item value="nuevo cliente" onSelect={() => go("/clientes?nuevo=1")}><Plus size={18} aria-hidden /> Nuevo cliente</Item>
            <Item value="nueva cita audiencia" onSelect={() => go("/agenda?nuevo=1")}><Plus size={18} aria-hidden /> Nueva cita o audiencia</Item>
            <Item value="nueva tarea" onSelect={() => go("/tareas?nuevo=1")}><Plus size={18} aria-hidden /> Nueva tarea</Item>
          </Command.Group>

          <Command.Group heading="Ir a" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[length:var(--text-body-sm)] [&_[cmdk-group-heading]]:text-ink-3">
            {NAV.map((n) => (
              <Item key={n.href} value={`ir ${n.label}`} onSelect={() => go(n.href)}>
                <n.icon size={18} aria-hidden /> {n.label}
              </Item>
            ))}
          </Command.Group>

          <Command.Group heading="Ayuda" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[length:var(--text-body-sm)] [&_[cmdk-group-heading]]:text-ink-3">
            <Item value="asistente legal ia" onSelect={() => { onOpenChange(false); onOpenAi(); }}><Sparkles size={18} aria-hidden /> Preguntar al asistente legal</Item>
            <Item value="cambiar tema oscuro claro" onSelect={() => { setPref("theme", prefs.theme === "oscuro" ? "claro" : "oscuro"); onOpenChange(false); }}>
              {prefs.theme === "oscuro" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />} Cambiar entre tema claro y oscuro
            </Item>
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}

function Item({ children, ...p }: React.ComponentProps<typeof Command.Item>) {
  return (
    <Command.Item
      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
      {...p}
    >
      {children}
    </Command.Item>
  );
}
