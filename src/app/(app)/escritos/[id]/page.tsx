import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { EscritoEditor } from "@/components/editor/escrito-editor";

export const metadata = { title: "Escrito · Counsel" };

export default async function EscritoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, content_html, case_id, current_version")
    .eq("id", id)
    .eq("kind", "escrito")
    .is("deleted_at", null)
    .maybeSingle();
  if (!doc) notFound();

  const [v, c] = await Promise.all([
    supabase.from("document_versions").select("version, note, created_at").eq("document_id", id).order("version", { ascending: false }),
    supabase.from("cases").select("id, title, case_number").is("deleted_at", null).order("title").limit(500),
  ]);

  return (
    <EscritoEditor
      id={doc.id}
      initialTitle={doc.title}
      initialHtml={doc.content_html ?? ""}
      initialCaseId={doc.case_id}
      initialVersion={doc.current_version}
      versions={v.data ?? []}
      cases={c.data ?? []}
    />
  );
}
