import Link from "next/link";
import { BrandStage } from "@/components/brand/brand-stage";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · Counsel" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ siguiente?: string }> }) {
  const { siguiente } = await searchParams;
  const missing = !process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <BrandStage title="Entrar a tu despacho" subtitle="Escribe tu correo y contraseña.">
      {missing && (
        <p role="alert" className="mb-4 rounded-lg bg-warn-soft p-3 text-warn">
          Falta configurar Supabase. Copia <code>.env.example</code> a <code>.env.local</code> (ver README).
        </p>
      )}
      <LoginForm next={siguiente} />
      <p className="mt-6 text-center text-ink-2">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-accent underline underline-offset-4">
          Crear mi despacho
        </Link>
      </p>
    </BrandStage>
  );
}
