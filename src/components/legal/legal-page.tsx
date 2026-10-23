import Link from "next/link";

export function LegalPage({ title, version, children }: { title: string; version: string; children: React.ReactNode }) {
  return (
    <main id="contenido" className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/login" className="text-accent underline underline-offset-4">← Volver</Link>
      <h1 className="mt-6 text-[length:var(--text-heading)]">{title}</h1>
      <p className="mt-1 text-ink-3">Versión {version}</p>
      <div className="mt-6 grid gap-4 leading-relaxed [&_h2]:mt-4 [&_h2]:text-[length:var(--text-heading-sm)]">{children}</div>
    </main>
  );
}
