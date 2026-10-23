"use client";
import * as React from "react";
import { FillFromStory } from "@/components/ai/fill-from-story";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/field";
import { TextWithDictation } from "@/components/ui/text-with-dictation";
import { Pill } from "@/components/ui/card";
import { DictationButton } from "@/components/dictation/dictation-button";
import { createEscritoFromTemplate } from "@/app/(app)/escritos/actions";
import { autofillValues, countUnfilled, mergeValues, renderTemplate, type AutofillCase, type AutofillClient, type TemplateVariable } from "@/lib/editor/template";

export interface FillTemplate { id?: string; title: string; body_html: string; variables: TemplateVariable[] }
export interface FillClient extends AutofillClient { id: string }
export interface FillCase extends AutofillCase { id: string; title: string; client_id: string }

/**
 * Diálogo "Completar datos". Reutilizable (también por el módulo de IA):
 *  - genera el formulario desde `template.variables`,
 *  - autollena con cliente/caso,
 *  - muestra vista previa en vivo,
 *  - al confirmar crea el escrito + versión 1 y abre /escritos/[id] (o llama a `onCreated`).
 */
export function TemplateFillDialog({
  template,
  open,
  onOpenChange,
  clients,
  cases,
  onCreated,
}: {
  template: FillTemplate | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clients: FillClient[];
  cases: FillCase[];
  onCreated?: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={template ? `Completar datos: ${template.title}` : "Completar datos"}
        description="Llena lo que sepas. Lo que falte quedará marcado en amarillo para completarlo después."
        className="w-[min(96vw,64rem)]"
      >
        {template && <FillBody template={template} onOpenChange={onOpenChange} clients={clients} cases={cases} onCreated={onCreated} />}
      </DialogContent>
    </Dialog>
  );
}

// Se monta solo con el diálogo abierto: el estado del formulario se reinicia solo.
function FillBody({
  template,
  onOpenChange,
  clients,
  cases,
  onCreated,
}: {
  template: FillTemplate;
  onOpenChange: (o: boolean) => void;
  clients: FillClient[];
  cases: FillCase[];
  onCreated?: (id: string) => void;
}) {
  const router = useRouter();
  const [clientId, setClientId] = React.useState("");
  const [caseId, setCaseId] = React.useState("");
  const [typed, setTyped] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const client = clients.find((c) => c.id === clientId) ?? null;
  const kase = cases.find((c) => c.id === caseId) ?? null;
  const auto = React.useMemo(() => autofillValues({ client, case: kase }), [client, kase]);
  const values = mergeValues(auto, typed);
  const vars = template.variables;
  const html = renderTemplate(template.body_html, values, vars);
  const missing = countUnfilled(html);
  const casesForClient = clientId ? cases.filter((c) => c.client_id === clientId) : cases;

  const set = (k: string, v: string) => setTyped((t) => ({ ...t, [k]: v }));
  const shown = (k: string) => typed[k] ?? auto[k] ?? "";

  function pickCase(id: string) {
    setCaseId(id);
    const c = cases.find((x) => x.id === id);
    if (c) setClientId(c.client_id);
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    const title = client ? `${template.title} – ${client.full_name}` : template.title;
    const r = await createEscritoFromTemplate({ title, html, caseId: caseId || null, clientId: clientId || null });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onOpenChange(false);
    if (onCreated) onCreated(r.id);
    else router.push(`/escritos/${r.id}`);
  }

  return (
    <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="grid content-start gap-4">
              <div className="grid gap-4 rounded-lg bg-surface-2 p-4">
                <p className="font-medium">Llenar con datos de un cliente o caso (opcional)</p>
                <Field label="Cliente" htmlFor="tf-cliente">
                  <Select id="tf-cliente" value={clientId} onChange={(e) => { setClientId(e.target.value); setCaseId(""); }}>
                    <option value="">Sin cliente</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </Select>
                </Field>
                <Field label="Caso" htmlFor="tf-caso">
                  <Select id="tf-caso" value={caseId} onChange={(e) => pickCase(e.target.value)}>
                    <option value="">Sin caso</option>
                    {casesForClient.map((c) => <option key={c.id} value={c.id}>{c.case_number ? `${c.case_number} · ` : ""}{c.title}</option>)}
                  </Select>
                </Field>
              </div>

              {template.id && <FillFromStory templateId={template.id} onValues={(v) => setTyped((t) => ({ ...t, ...v }))} />}

              {vars.map((v) => {
                const id = `tf-${v.key}`;
                const val = shown(v.key);
                return (
                  <Field key={v.key} label={v.label} htmlFor={id}>
                    {v.type === "largo" ? (
                      <TextWithDictation id={id} value={val} onChange={(x) => set(v.key, x)} rows={4} />
                    ) : (
                      <div className="grid gap-2">
                        <Input
                          id={id}
                          type={v.type === "fecha" ? "date" : "text"}
                          inputMode={v.type === "numero" ? "decimal" : undefined}
                          value={val}
                          onChange={(e) => set(v.key, e.target.value)}
                        />
                        {(v.type ?? "texto") === "texto" && (
                          <div><DictationButton onText={(t) => set(v.key, (val ? val + " " : "") + t.trim())} /></div>
                        )}
                      </div>
                    )}
                  </Field>
                );
              })}
            </div>

            <div className="grid content-start gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[length:var(--text-subheading)] font-semibold">Vista previa</h3>
                {missing > 0 ? <Pill tone="warn">{missing} por completar</Pill> : <Pill tone="ok">Todo completo</Pill>}
              </div>
              {/* El HTML sale de renderTemplate: los valores van escapados. */}
              <div
                className="legal-doc max-h-[60dvh] overflow-y-auto rounded-lg border border-line bg-canvas px-5 py-5"
                aria-label="Vista previa del escrito"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>
        <div className="mt-6 grid gap-2">
          <p role="alert" aria-live="polite" className="text-danger empty:hidden">{error}</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={confirm} disabled={busy}>Crear escrito</Button>
          </div>
        </div>
    </>
  );
}
