import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/registro", "/consulta", "/reservar", "/terminos", "/privacidad", "/offline", "/auth", "/vista-previa"];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  // Solo desarrollo con NEXT_PUBLIC_DESIGN_PREVIEW=1: las pantallas se muestran con datos de ejemplo, sin login.
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DESIGN_PREVIEW === "1") {
    const direct = ["panel", "casos", "clientes", "agenda", "tareas", "ajustes"];
    const first = pathname.split("/")[1];
    const rest = pathname.split("/").length > 2;
    const other = ["documentos", "plantillas", "cobros", "tiempo", "consultas", "escritos"];
    const to = request.nextUrl.clone();
    if (pathname === "/") to.pathname = "/vista-previa";
    else if (first === "panel") to.pathname = "/vista-previa";
    else if (direct.includes(first) && !rest) to.pathname = "/vista-previa/" + first;
    else if (direct.includes(first) || other.includes(first)) to.pathname = "/vista-previa/pronto";
    else return NextResponse.next();
    return NextResponse.rewrite(to);
  }

  // Sin configuración de Supabase: dejar pasar solo páginas públicas (la app muestra instrucciones).
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const isPublic = pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!data.user && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.searchParams.set("siguiente", pathname);
    return NextResponse.redirect(to);
  }
  if (data.user && (pathname.startsWith("/login") || pathname.startsWith("/registro"))) {
    const to = request.nextUrl.clone();
    to.pathname = "/panel";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
