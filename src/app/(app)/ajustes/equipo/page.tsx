import { PageHeader } from "@/components/ui/card";
import { TeamManager, type MemberRow } from "@/components/equipo/team-manager";
import { requireStaff } from "@/lib/auth";
import { MAX_TEAM_MEMBERS, type StaffRole } from "@/lib/equipo/roles";

export const metadata = { title: "Equipo · Counsel" };

export default async function Equipo() {
  const { supabase, profile } = await requireStaff();
  const isOwner = profile.role === "owner";

  let members: MemberRow[] = [];
  if (isOwner || profile.role === "lawyer") {
    const { data } = await supabase
      .from("profiles")
      .select("id,full_name,email,role,active")
      .neq("role", "client")
      .order("full_name");
    members = (data ?? []) as MemberRow[];
  } else {
    // El asistente solo ve nombre y rol (directorio mínimo).
    const { data } = await supabase.rpc("team_directory");
    members = ((data ?? []) as { id: string; full_name: string; role: StaffRole; active: boolean }[]).map((m) => ({ ...m, email: null }));
  }
  if (!isOwner) members = members.filter((m) => m.active);

  return (
    <>
      <PageHeader
        title="Equipo"
        subtitle={
          isOwner
            ? "Invita a tus colegas y decide qué puede hacer cada uno."
            : "Las personas de tu despacho. Solo la persona titular cambia el equipo."
        }
      />
      <TeamManager members={members} meId={profile.id} isOwner={isOwner} max={MAX_TEAM_MEMBERS} />
    </>
  );
}
