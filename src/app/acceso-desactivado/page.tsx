import { BrandStage } from "@/components/brand/brand-stage";
import { signOut } from "@/app/(auth)/actions";

export const metadata = { title: "Acceso desactivado · Counsel" };

export default function AccesoDesactivado() {
  return (
    <BrandStage title="Tu acceso fue desactivado" subtitle="El titular del despacho quitó tu acceso. Si crees que es un error, escríbele para que lo vuelva a activar.">
      <form action={signOut}>
        <button className="press min-h-12 w-full cursor-pointer rounded-[var(--radius-btn)] bg-accent px-5 font-medium text-accent-ink">Cerrar sesión</button>
      </form>
    </BrandStage>
  );
}
