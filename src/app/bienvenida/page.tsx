import { BrandStage } from "@/components/brand/brand-stage";
import { WelcomeForm } from "./welcome-form";

export const metadata = { title: "Bienvenida · Counsel" };

export default function WelcomePage() {
  return (
    <BrandStage title="Bienvenido" subtitle="Un último paso: cuéntanos el nombre de tu despacho.">
      <WelcomeForm />
    </BrandStage>
  );
}
