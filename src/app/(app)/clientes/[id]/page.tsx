import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, MapPin, Phone, Plus } from "lucide-react";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ClienteAcciones } from "@/components/clientes/cliente-acciones";
import { fmtDate, MATTERS, STAGES } from "@/lib/format";
import type { Case, Client } from "@/lib/db/types";

export const metadata = { title: "Cliente · Counsel" };

export default async function ClienteDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase } = await requireStaff();
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).is("deleted_at", null).maybeSingle<Client>();
  if (!client) notFound();
  const { data: cases } = await supabase
    .from("cases").select("*").eq("client_id", id).is("deleted_at", null).order("created_at", { ascending: false });
  const list = (cases ?? []) as Case[];
  const phoneHref = client.phone ? `tel:${client.phone.replace(/[^\d+]/g, "")}` : null;

  return (
    <>
      <Link href="/clientes" className="mb-3 inline-flex min-h-11 items-center gap-1 text-accent hover:underline">
        <ChevronLeft size={20} aria-hidden /> Todos los clientes
      </Link>
      <PageHeader
        title={client.full_name}
        subtitle={`${client.kind === "empresa" ? "Empresa" : "Persona"}${client.ci_nit ? ` · ${client.kind === "empresa" ? "NIT" : "CI"} ${client.ci_nit}` : ""}`}
        action={
          <Button asChild variant="primary"><Link href={`/casos?nuevo=1&cliente=${client.id}`}><Plus size={20} aria-hidden /> Nuevo caso</Link></Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="grid content-start gap-4">
          <Card className="grid gap-3">
            <h2 className="text-[length:var(--text-subheading)] font-semibold">Contacto</h2>
            {!client.phone && !client.email && !client.address && <p className="text-ink-2">Aún no hay datos de contacto. Usa “Editar datos” para agregarlos.</p>}
            {phoneHref && (
              <Button asChild variant="secondary" className="justify-start"><a href={phoneHref}><Phone size={20} aria-hidden /> Llamar: {client.phone}</a></Button>
            )}
            {client.email && (
              <Button asChild variant="secondary" className="justify-start break-all whitespace-normal"><a href={`mailto:${client.email}`}><Mail size={20} aria-hidden /> Escribir: {client.email}</a></Button>
            )}
            {client.address && <p className="flex items-start gap-2 text-ink-2"><MapPin size={20} aria-hidden className="mt-0.5 shrink-0" /> {client.address}</p>}
          </Card>
          {client.notes && (
            <Card>
              <h2 className="mb-2 text-[length:var(--text-subheading)] font-semibold">Notas</h2>
              <p className="whitespace-pre-wrap text-ink-2">{client.notes}</p>
            </Card>
          )}
          <ClienteAcciones cliente={client} />
        </div>

        <section aria-labelledby="casos-del-cliente">
          <h2 id="casos-del-cliente" className="mb-3 text-[length:var(--text-heading-sm)] font-semibold">Casos de este cliente</h2>
          {list.length === 0 ? (
            <EmptyState
              title="Todavía no tiene casos"
              description="Abre el primer caso de este cliente para empezar a llevar su seguimiento."
              action={<Button asChild variant="secondary"><Link href={`/casos?nuevo=1&cliente=${client.id}`}>Abrir un caso</Link></Button>}
            />
          ) : (
            <ul className="grid gap-3">
              {list.map((c) => (
                <li key={c.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <Link href={`/casos/${c.id}`} className="font-semibold text-ink hover:text-accent">{c.title}</Link>
                      <p className="text-[length:var(--text-body-sm)] text-ink-2">
                        {c.case_number ? `Exp. ${c.case_number} · ` : ""}Abierto el {fmtDate(c.opened_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Pill tone="neutral">{MATTERS[c.matter] ?? c.matter}</Pill>
                      <Pill tone="accent">{STAGES.find((s) => s.id === c.stage)?.label ?? c.stage}</Pill>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
