import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ilikePattern, mergeHits, searchSchema, PER_GROUP, type SearchHit } from "@/lib/panel/search";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = searchSchema.safeParse({ q: req.nextUrl.searchParams.get("q") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "Escribe entre 2 y 80 caracteres." }, { status: 400 });
  const pat = ilikePattern(parsed.data.q);

  // Cada columna en su propia consulta: evita armar filtros .or() con texto del usuario.
  const clientQ = (col: "full_name" | "ci_nit") =>
    supabase.from("clients").select("id, full_name, ci_nit").is("deleted_at", null).ilike(col, pat).limit(PER_GROUP);
  const caseQ = (col: "title" | "case_number" | "opponent") =>
    supabase.from("cases").select("id, title, case_number, opponent").is("deleted_at", null).ilike(col, pat).limit(PER_GROUP);
  const docQ = supabase.from("documents").select("id, title").is("deleted_at", null).ilike("title", pat).limit(PER_GROUP);

  const [c1, c2, k1, k2, k3, d] = await Promise.all([
    clientQ("full_name"), clientQ("ci_nit"), caseQ("title"), caseQ("case_number"), caseQ("opponent"), docQ,
  ]);

  const toClient = (rows: { id: string; full_name: string; ci_nit: string | null }[] | null): SearchHit[] =>
    (rows ?? []).map((r) => ({ id: `cl-${r.id}`, label: r.full_name, sub: r.ci_nit ?? undefined, href: `/clientes/${r.id}`, group: "Clientes" }));
  const toCase = (rows: { id: string; title: string; case_number: string | null; opponent: string | null }[] | null): SearchHit[] =>
    (rows ?? []).map((r) => ({
      id: `ca-${r.id}`, label: r.title, sub: r.case_number ?? (r.opponent ? `contra ${r.opponent}` : undefined), href: `/casos/${r.id}`, group: "Casos",
    }));
  const docs: SearchHit[] = (d.data ?? []).map((r) => ({
    id: `do-${r.id}`, label: r.title, href: `/documentos?q=${encodeURIComponent(r.title)}`, group: "Documentos",
  }));

  const results = [
    ...mergeHits([toClient(c1.data), toClient(c2.data)]),
    ...mergeHits([toCase(k1.data), toCase(k2.data), toCase(k3.data)]),
    ...mergeHits([docs]),
  ];
  return NextResponse.json({ results });
}
