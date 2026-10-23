import { BrandStage } from "@/components/brand/brand-stage";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Crea tu contraseña · Counsel" };

export default function Clave() {
  return (
    <BrandStage title="Crea tu contraseña" subtitle="Así podrás entrar a ver tu caso cuando quieras.">
      <PasswordForm />
    </BrandStage>
  );
}
