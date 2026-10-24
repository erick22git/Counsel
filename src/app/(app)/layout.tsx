import { requireStaff } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { PrefsProvider } from "@/components/shell/prefs-provider";
import { TermsGate } from "@/components/legal/terms-gate";
import { TERMS_VERSION } from "@/lib/legal/versions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile, firm } = await requireStaff();
  const { count } = await supabase
    .from("terms_acceptances")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("version", TERMS_VERSION);
  return (
    <PrefsProvider initial={profile.preferences}>
      <AppShell firmName={firm.name} userName={profile.full_name}>
        {children}
      </AppShell>
      <TermsGate needed={(count ?? 0) < 2} />
    </PrefsProvider>
  );
}
