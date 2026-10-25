import Link from "next/link";
import { PageHeader, Card, Pill } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { providerStatus } from "@/lib/ai/providers";
import { PrefsForm } from "./prefs-form";

export const metadata = { title: "Ajustes · Counsel" };

const ROLE: Record<string, string> = { owner: "Titular", lawyer: "Abogado", assistant: "Asistente" };

function LinkCard({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <Card>
      <h2 className="text-[length:var(--text-heading-sm)]">{title}</h2>
      <p className="mt-2 text-ink-2">{text}</p>
      <Link href={href} className="mt-3 inline-flex min-h-11 items-center font-medium text-accent underline underline-offset-4">{cta}</Link>
    </Card>
  );
}

export default async function Ajustes() {
  const { profile, firm } = await requireStaff();
  const ai = providerStatus();
  const isOwner = profile.role === "owner";
  return (
    <>
      <PageHeader title="Ajustes" subtitle="Hazlo cómodo para ti. Se guarda en tu cuenta." />
      <div className="grid max-w-2xl gap-6">
        <PrefsForm />

        <Card>
          <h2 className="text-[length:var(--text-heading-sm)]">Tu despacho</h2>
          <dl className="mt-3 grid gap-2">
            <div><dt className="text-ink-3">Nombre</dt><dd>{firm.name}</dd></div>
            <div><dt className="text-ink-3">Tu cuenta</dt><dd>{profile.full_name} · {profile.email} · <Pill>{ROLE[profile.role] ?? profile.role}</Pill></dd></div>
          </dl>
        </Card>

        <Card>
          <h2 className="text-[length:var(--text-heading-sm)]">Asistente de IA</h2>
          <p className="mt-2">Proveedor activo: <strong>{ai.label}</strong> · {ai.model}</p>
          {ai.warning && <p className="mt-2 rounded-md bg-danger-soft px-3 py-2 font-medium text-danger">{ai.warning}</p>}
          {ai.blocker && <p className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-warn">{ai.blocker}. Configúralo en el archivo .env.local.</p>}
          <p className="mt-2 text-ink-2">Se cambia con la variable AI_PROVIDER (ollama, gemini, anthropic, openai o mock).</p>
          <Link href="/fuentes" className="mt-3 inline-flex min-h-11 items-center font-medium text-accent underline underline-offset-4">Ver fuentes legales</Link>
        </Card>

        <LinkCard title="Seguridad" text="Activa la verificación en dos pasos para proteger tu cuenta." href="/ajustes/seguridad" cta="Configurar seguridad" />
        {isOwner && <LinkCard title="Equipo" text="Invita a colegas y asistentes y elige qué puede hacer cada uno." href="/ajustes/equipo" cta="Administrar equipo" />}
        {isOwner && <LinkCard title="Historial de cambios" text="Quién cambió qué en casos, documentos y cobros." href="/ajustes/auditoria" cta="Ver historial" />}
      </div>
    </>
  );
}
