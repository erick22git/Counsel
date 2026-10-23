import { LayoutDashboard, Briefcase, Users, CalendarDays, CheckSquare, FileText, ScrollText, Receipt, Timer, Settings, Inbox, type LucideIcon } from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon; primary?: boolean }

/** Navegación única: ícono + texto siempre. `primary` = visible en la barra inferior del móvil. */
export const NAV: NavItem[] = [
  { href: "/panel", label: "Inicio", icon: LayoutDashboard, primary: true },
  { href: "/casos", label: "Casos", icon: Briefcase, primary: true },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, primary: true },
  { href: "/tareas", label: "Tareas", icon: CheckSquare, primary: true },
  { href: "/consultas", label: "Consultas", icon: Inbox },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/plantillas", label: "Plantillas", icon: ScrollText },
  { href: "/cobros", label: "Cobros", icon: Receipt },
  { href: "/tiempo", label: "Tiempo", icon: Timer },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];
