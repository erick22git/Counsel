import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, PageHeader, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireStaff } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { NewEscrito } from "./new-escrito";

export const metadata = { title: "Escritos · Counsel" };

export default async function Escritos({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const { data } = await supabase
    .from("documents")
    .select("id, title, current_version, updated_at, cases(title, case_number)")
    .eq("kind", "escrito")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as {
    id: string; title: string; current_version: number; updated_at: string; cases: { title: string; case_number: string | null } | null;
  }[];
  const nuevo = sp.nuevo === "1";

  return (
    <>
      <PageHeader
        title="Escritos"
        subtitle="Tus memoriales, contratos y cartas. Se guardan solos mientras escribes."
        action={rows.length > 0 ? <NewEscrito defaultOpen={nuevo} /> : undefined}
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Aún no tienes escritos"
          description="Empieza en blanco o usa una plantilla lista para completar."
          action={<NewEscrito defaultOpen={nuevo} />}
        />
      ) : (
        <ul className="grid gap-3">
          {rows.map((d) => (
            <li key={d.id}>
              <Link href={`/escritos/${d.id}`} className="press block">
                <Card className="flex flex-wrap items-center gap-4 hover:bg-surface-2">
                  <FileText size={24} aria-hidden className="text-ink-3" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[length:var(--text-subheading)] font-semibold">{d.title}</p>
                    <p className="text-ink-2">
                      {d.cases ? `Caso: ${d.cases.case_number ? d.cases.case_number + " · " : ""}${d.cases.title}` : "Sin caso"} · Editado {fmtDateTime(d.updated_at)}
                    </p>
                  </div>
                  <Pill>Versión {d.current_version}</Pill>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
