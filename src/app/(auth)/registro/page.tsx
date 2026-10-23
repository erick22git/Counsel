import Link from "next/link";
import { BrandStage } from "@/components/brand/brand-stage";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Crear mi despacho · Counsel" };

export default function RegisterPage() {
  return (
    <BrandStage title="Crea tu despacho" subtitle="Tarda menos de un minuto. Podrás invitar a tu equipo después.">
      <RegisterForm />
      <p className="mt-6 text-center text-ink-2">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-accent underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </BrandStage>
  );
}
