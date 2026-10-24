import { notFound } from "next/navigation";
import { PrefsProvider } from "@/components/shell/prefs-provider";
import { AppShell } from "@/components/shell/app-shell";

/** Solo desarrollo: muestra las pantallas con datos de ejemplo, sin Supabase ni login. */
export default function VistaPreviaLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <PrefsProvider>
      <AppShell firmName="Despacho Demo (vista previa)" userName="Elena Ficticia Rojas">
        {children}
      </AppShell>
    </PrefsProvider>
  );
}
