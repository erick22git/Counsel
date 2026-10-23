import { PageHeader, Card } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { PrefsForm } from "./prefs-form";

export const metadata = { title: "Ajustes · Counsel" };

export default async function Ajustes() {
  const { profile, firm } = await requireStaff();
  return (
    <>
      <PageHeader title="Ajustes" subtitle="Hazlo cómodo para ti. Se guarda en tu cuenta." />
      <div className="grid gap-6 max-w-2xl">
        <PrefsForm />
        <Card>
          <h2 className="text-[length:var(--text-heading-sm)]">Tu despacho</h2>
          <dl className="mt-3 grid gap-2">
            <div><dt className="text-ink-3">Nombre</dt><dd>{firm.name}</dd></div>
            <div><dt className="text-ink-3">Tu cuenta</dt><dd>{profile.full_name} · {profile.email}</dd></div>
          </dl>
        </Card>
      </div>
    </>
  );
}
