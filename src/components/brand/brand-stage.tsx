import * as React from "react";

/** Momento de marca (Lusion): lienzo lavanda, contenedor suave, figuras mudas. Usado en login, registro, bienvenida. */
export function BrandStage({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-brand px-4 py-10 md:grid md:place-items-center">
      <div className="mx-auto grid w-full max-w-5xl gap-10 md:grid-cols-[1fr_28rem] md:items-center">
        <div className="enter hidden md:block">
          <p className="text-[length:var(--text-body-sm)] font-medium uppercase tracking-[0.12em] text-ink-2">Counsel</p>
          <h1 className="mt-4 text-[length:var(--text-display)] font-medium leading-[1.02] tracking-[-0.02em]">
            Tu despacho,
            <br /> en orden.
          </h1>
          <p className="mt-6 max-w-sm text-[length:var(--text-subheading)] text-ink-2">
            Casos, plazos, escritos y cobros en un solo lugar. Lo que tomaba 10 minutos, ahora toma 2 clics.
          </p>
          <svg width="260" height="150" viewBox="0 0 260 150" aria-hidden className="mt-10">
            <rect x="6" y="50" width="110" height="90" rx="26" fill="var(--sky)" />
            <circle cx="160" cy="70" r="58" fill="var(--sand)" />
            <rect x="96" y="6" width="70" height="70" rx="22" fill="var(--sage)" transform="rotate(10 131 41)" />
            <path d="M200 20v16M192 28h16" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="enter rounded-[28px] border border-line bg-surface p-7 md:p-9">
          <h2 className="text-[length:var(--text-heading)] font-medium tracking-[-0.02em]">{title}</h2>
          {subtitle && <p className="mt-2 text-ink-2">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
