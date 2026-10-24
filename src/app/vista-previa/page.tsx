import { Button } from "@/components/ui/button";
import { Card, PageHeader, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { STAGES } from "@/lib/format";

export const metadata = { title: "Vista previa del diseño · Counsel" };

const CASES: Record<string, { t: string; c: string; m: string; p?: string }[]> = {
  nuevo: [{ t: "Constitución de sociedad", c: "Comercial Ficticia S.R.L.", m: "Comercial" }],
  en_tramite: [
    { t: "Cobro de alquileres atrasados", c: "Marcos Ejemplo Quispe", m: "Civil", p: "Plazo en 3 días" },
    { t: "Denuncia por estafa", c: "Rodrigo Prueba Choque", m: "Penal" },
  ],
  audiencia: [{ t: "Asistencia familiar", c: "Lucía Muestra Mamani", m: "Familia", p: "Audiencia mañana" }],
  resolucion: [{ t: "Reincorporación laboral", c: "Carmen Demo Flores", m: "Laboral" }],
  cerrado: [{ t: "Compraventa de terreno", c: "Marcos Ejemplo Quispe", m: "Civil" }],
};

/** Solo desarrollo: muestra el diseño con datos de ejemplo, sin Supabase. */
export default function VistaPrevia() {
  return (
    <>
        <PageHeader
          title="Buenos días, Elena"
          subtitle="Vista previa del diseño con datos de ejemplo. Prueba el tema y el tamaño de letra en Ajustes (barra lateral)."
          action={<Button variant="primary">Nuevo caso</Button>}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h2 className="mb-3 text-[length:var(--text-subheading)]">Lo de hoy</h2>
            <ul className="divide-y divide-line">
              {[
                ["10:00", "Audiencia de asistencia familiar", "Juzgado de Familia (ficticio)", "Audiencia", "accent"],
                ["15:00", "Reunión con socios", "Oficina", "Cita", "ok"],
                ["12:00", "Plazo para presentar memorial", "Cobro de alquileres", "Plazo", "warn"],
              ].map(([h, t, s, k, tone]) => (
                <li key={t} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="w-14 font-semibold tabular-nums">{h}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{t}</span>
                    <span className="block text-[length:var(--text-body-sm)] text-ink-2">{s}</span>
                  </span>
                  <Pill tone={tone as "accent" | "ok" | "warn"}>{k}</Pill>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="mb-3 text-[length:var(--text-subheading)]">Por cobrar</h2>
            <p className="text-[length:var(--text-heading)] font-semibold">Bs 1.800,00</p>
            <p className="mt-1 text-ink-2">1 cobro enviado, vence en 5 días</p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary">Ver cobros</Button>
              <Button variant="outline">Registrar pago</Button>
            </div>
          </Card>
        </div>

        <h2 className="mb-3 mt-10 text-[length:var(--text-heading-sm)]">Casos (tablero)</h2>
        <div className="grid gap-4 overflow-x-auto pb-2 md:grid-cols-3 xl:grid-cols-5">
          {STAGES.map((s) => (
            <section key={s.id} aria-label={s.label} className="min-w-52 rounded-[var(--radius-card)] bg-surface-2 p-3">
              <h3 className="mb-2 px-1 font-medium">{s.label} <span className="text-ink-3">({CASES[s.id].length})</span></h3>
              <ul className="grid gap-2">
                {CASES[s.id].map((c) => (
                  <li key={c.t} className="rounded-lg border border-line bg-surface p-3">
                    <p className="font-medium">{c.t}</p>
                    <p className="text-[length:var(--text-body-sm)] text-ink-2">{c.c}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Pill>{c.m}</Pill>
                      {c.p && <Pill tone="warn">{c.p}</Pill>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="grid gap-4">
            <h2 className="text-[length:var(--text-subheading)]">Formulario</h2>
            <Field label="Nombre del cliente" hint="Ejemplo: Marcos Ejemplo Quispe"><Input placeholder="Escribe aquí" /></Field>
            <Field label="Correo" error="Escribe un correo válido"><Input defaultValue="marcos@" /></Field>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary">Guardar</Button>
              <Button variant="secondary">Secundario</Button>
              <Button variant="outline">Contorno</Button>
              <Button variant="danger">Eliminar</Button>
            </div>
          </Card>
          <EmptyState title="Aún no hay documentos" description="Sube tu primer documento y verás aquí sus versiones." action={<Button variant="primary">Subir documento</Button>} />
        </div>
    </>
  );
}
