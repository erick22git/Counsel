import { requireStaff } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import { PrefsProvider } from "@/components/shell/prefs-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, firm } = await requireStaff();
  return (
    <PrefsProvider initial={profile.preferences}>
      <AppShell firmName={firm.name} userName={profile.full_name}>
        {children}
      </AppShell>
    </PrefsProvider>
  );
}
