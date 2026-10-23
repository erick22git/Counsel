import { Card, PageHeader, Pill } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { AI_DISCLAIMER } from "@/lib/ai/prompts";

export const metadata = { title: "Fuentes legales · Counsel" };

export default async function Fuentes() {
  const { supabase } = await requireStaff();
  const { data: sources } = await supabase.from("law_sources").select("id,code,title,source_name,source_url,license,is_demo,retrieved_at").order("title");
  return (
    <>
      <PageHeader title="Fuentes legales" subtitle="De dónde sale lo que cita el asistente." />
      <Card className="mb-6">
        <p>{AI_DISCLAIMER}</p>
        <p className="mt-2 text-ink-2">
          Los textos provienen de <a className="text-accent underline" href="https://www.lexivox.org" target="_blank" rel="noreferrer">Lexivox</a>, publicados bajo la Licencia de Documentación Libre de GNU (GFDL). Se muestran con atribución y pueden contener errores de transcripción: confirma siempre en la Gaceta Oficial de Bolivia.
        </p>
      </Card>
      {!sources?.length ? (
        <p className="text-ink-2">Todavía no se cargaron leyes. El administrador debe ejecutar la carga (ver README).</p>
      ) : (
        <ul className="grid gap-3">
          {sources.map((s) => (
            <li key={s.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{s.title} <span className="text-ink-3">({s.code})</span></p>
                  <p className="text-[length:var(--text-body-sm)] text-ink-2">
                    {s.source_name} · {s.license} · cargado {fmtDate(s.retrieved_at)}
                    {s.source_url && (<> · <a className="text-accent underline" href={s.source_url} target="_blank" rel="noreferrer">ver original</a></>)}
                  </p>
                </div>
                {s.is_demo && <Pill tone="warn">Demo, no vigente</Pill>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
