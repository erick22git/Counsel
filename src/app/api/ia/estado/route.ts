import { createClient } from "@/lib/supabase/server";
import { providerStatus } from "@/lib/ai/providers";

/** Qué proveedor de IA está activo (para mostrar el aviso de privacidad en la interfaz). */
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "No autenticado" }, { status: 401 });
  const s = providerStatus();
  return Response.json({ id: s.id, label: s.label, model: s.model, privacy: s.privacy, ready: s.ready, warning: s.warning, blocker: s.blocker });
}
