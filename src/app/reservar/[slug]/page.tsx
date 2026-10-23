import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandStage } from "@/components/brand/brand-stage";
import { BookingBot } from "./booking-bot";

export const metadata = { title: "Reservar una cita" };

export default async function ReservarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("firm_public", { p_slug: slug });
  const firm = (data as { name: string; bot_enabled: boolean }[] | null)?.[0];
  if (!firm || !firm.bot_enabled) notFound();
  return (
    <BrandStage title="Reservar una cita" subtitle={`Con ${firm.name}. Responde unas preguntas cortas.`}>
      <BookingBot slug={slug} />
    </BrandStage>
  );
}
