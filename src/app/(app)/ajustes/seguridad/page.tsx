import { PageHeader, Card } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { MfaPanel } from "@/components/seguridad/mfa-panel";
import { MemberReset } from "@/components/seguridad/member-reset";

export const metadata = { title: "Seguridad · Counsel" };

export default async function Seguridad() {
  const { supabase, profile, user } = await requireStaff();
  const { data: f } = await supabase.auth.mfa.listFactors();
  const enabled = (f?.totp ?? []).some((x) => x.status === "verified");
  const team = profile.role === "owner"
    ? ((await supabase.from("profiles").select("id, full_name, email, role").neq("role", "client").neq("id", user.id)).data ?? [])
    : [];
  return (
    <>
      <PageHeader title="Seguridad" subtitle="Protege tu cuenta con un segundo paso al entrar." />
      <div className="grid max-w-2xl gap-6">
        <MfaPanel enabled={enabled} />
        {profile.role === "owner" && (
          <Card className="grid gap-3">
            <h2 className="text-[length:var(--text-heading-sm)]">Tu equipo</h2>
            <p className="text-ink-2">Si alguien perdió su teléfono, puedes quitarle la verificación para que vuelva a entrar y la active de nuevo.</p>
            {team.length === 0 && <p className="text-ink-3">Aún no hay más integrantes.</p>}
            <ul className="grid gap-4">
              {team.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-medium">{m.full_name}</p><p className="text-ink-3">{m.email}</p></div>
                  <MemberReset id={m.id} name={m.full_name} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
