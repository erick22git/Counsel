import { redirect } from "next/navigation";
import { BrandStage } from "@/components/brand/brand-stage";
import { createClient } from "@/lib/supabase/server";
import { VerifyForm } from "./verify-form";

export const metadata = { title: "Verificar · Counsel" };

export default async function VerificarPage({ searchParams }: { searchParams: Promise<{ siguiente?: string }> }) {
  const { siguiente } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return (
    <BrandStage title="Verificación en dos pasos" subtitle="Abre tu aplicación de códigos (Google Authenticator, Microsoft Authenticator o Authy) y escribe los 6 números.">
      <VerifyForm next={siguiente} />
    </BrandStage>
  );
}
