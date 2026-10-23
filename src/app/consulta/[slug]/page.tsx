import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandStage } from "@/components/brand/brand-stage";
import { IntakeForm } from "./intake-form";

export const metadata = { title: "Cuéntanos tu caso" };

export default async function ConsultaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("firm_public", { p_slug: slug });
  const firm = (data as { name: string; intake_enabled: boolean }[] | null)?.[0];
  if (!firm || !firm.intake_enabled) notFound();
  return (
    <BrandStage title="Cuéntanos tu caso" subtitle={`Tu consulta llegará a ${firm.name}. Te responderán lo antes posible.`}>
      <IntakeForm slug={slug} />
    </BrandStage>
  );
}
