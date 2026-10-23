export const metadata = { title: "Sin conexión · Counsel" };

export default function Offline() {
  return (
    <main className="grid min-h-dvh place-items-center bg-brand px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-[length:var(--text-heading)]">Sin conexión</h1>
        <p className="mt-3 text-ink-2">No hay internet en este momento. Cuando vuelva, tu trabajo seguirá donde lo dejaste.</p>
      </div>
    </main>
  );
}
