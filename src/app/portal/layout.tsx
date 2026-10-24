import { requireClient } from "@/lib/auth";
import { PrefsProvider } from "@/components/shell/prefs-provider";
import { signOut } from "@/app/(auth)/actions";

export const metadata = { title: "Mi caso · Counsel" };

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireClient();
  return (
    <PrefsProvider initial={profile.preferences}>
      <div className="min-h-dvh bg-brand">
        <header className="flex items-center justify-between px-4 py-5 md:px-10">
          <p className="text-[length:var(--text-body-sm)] font-medium uppercase tracking-[0.12em]">Counsel · Portal del cliente</p>
          <form action={signOut}>
            <button className="press min-h-11 cursor-pointer rounded-full border border-line-strong bg-surface px-5">Salir</button>
          </form>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-3xl px-4 pb-16 md:px-6">{children}</main>
      </div>
    </PrefsProvider>
  );
}
