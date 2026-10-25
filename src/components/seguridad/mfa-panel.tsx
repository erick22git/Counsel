"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, Pill } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { cancelEnroll, confirmEnroll, disableMfa, startEnroll } from "@/app/(app)/ajustes/seguridad/actions";

type Step = "idle" | "enroll" | "disable";

export function MfaPanel({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("idle");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [code, setCode] = React.useState("");
  const [enroll, setEnroll] = React.useState<{ factorId: string; qr: string; secret: string }>();

  const reset = () => { setStep("idle"); setCode(""); setError(undefined); setEnroll(undefined); };

  async function begin() {
    setBusy(true); setError(undefined);
    const r = await startEnroll();
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setEnroll(r); setStep("enroll");
  }
  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    setBusy(true); setError(undefined);
    const r = await confirmEnroll(enroll.factorId, code);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast.success("Verificación en dos pasos activada");
    reset(); router.refresh();
  }
  async function cancel() {
    if (enroll) await cancelEnroll(enroll.factorId);
    reset();
  }
  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(undefined);
    const r = await disableMfa(code);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast.success("Verificación en dos pasos desactivada");
    reset(); router.refresh();
  }

  const codeField = (
    <Field label="Código de 6 números" htmlFor="mfa-code" error={error} hint="Lo ves en tu aplicación. Cambia cada 30 segundos.">
      <Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} required autoFocus
        value={code} onChange={(e) => setCode(e.target.value)} className="text-center text-2xl tracking-[0.4em]" />
    </Field>
  );

  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[length:var(--text-heading-sm)]">Verificación en dos pasos</h2>
        <Pill tone={enabled ? "ok" : "neutral"}>{enabled ? "Verificación en dos pasos: activada" : "Verificación en dos pasos: desactivada"}</Pill>
      </div>
      <p className="max-w-prose text-ink-2">
        Además de tu contraseña, te pedimos un código de 6 números que muestra una aplicación en tu teléfono. Así, aunque alguien conozca tu contraseña, no podrá entrar.
      </p>

      {step === "idle" && !enabled && (
        <div className="grid gap-2">
          <div><Button variant="primary" onClick={begin} disabled={busy}>{busy ? "Preparando…" : "Activar"}</Button></div>
          {error && <p role="alert" className="text-danger">{error}</p>}
        </div>
      )}

      {step === "idle" && enabled && (
        <div><Button variant="outline" onClick={() => { setStep("disable"); setCode(""); setError(undefined); }}>Desactivar</Button></div>
      )}

      {step === "enroll" && enroll && (
        <form onSubmit={confirm} className="grid gap-5">
          <ol className="grid list-decimal gap-2 pl-6 text-ink">
            <li>Instala en tu teléfono una de estas aplicaciones gratis: <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong> o <strong>Authy</strong>.</li>
            <li>Ábrela y elige «Agregar cuenta» o el signo «+». Apunta la cámara a este cuadro.</li>
            <li>Escribe aquí los 6 números que aparecen y toca «Confirmar».</li>
          </ol>
          <div className="flex flex-wrap items-center gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG en data: devuelto por Supabase */}
            <img src={enroll.qr} alt="Código QR para tu aplicación de verificación. Si no puedes escanearlo, usa el código secreto que está al lado." width={176} height={176} className="rounded-lg border border-line bg-white p-2" />
            <div className="grid gap-1">
              <p className="text-ink-2">¿No puedes escanear? Escribe este código secreto en tu aplicación:</p>
              <code className="select-all break-all rounded-lg bg-surface-2 px-3 py-2 text-lg tracking-wider">{enroll.secret}</code>
            </div>
          </div>
          {codeField}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="outline" disabled={busy}>{busy ? "Confirmando…" : "Confirmar"}</Button>
            <Button type="button" variant="ghost" onClick={cancel}>Cancelar</Button>
          </div>
        </form>
      )}

      {step === "disable" && (
        <form onSubmit={disable} className="grid gap-5">
          <p className="rounded-lg bg-warn-soft p-3 text-warn">
            Si la desactivas, tu cuenta quedará protegida solo con la contraseña. Para confirmar, escribe un código vigente de tu aplicación.
          </p>
          {codeField}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="danger" disabled={busy}>{busy ? "Desactivando…" : "Sí, desactivar"}</Button>
            <Button type="button" variant="ghost" onClick={reset}>No, mantenerla activa</Button>
          </div>
        </form>
      )}

      <p className="text-ink-3">
        Si pierdes tu teléfono, pide al titular del despacho que desactive tu verificación. Guarda también el código secreto en un lugar seguro: con él puedes volver a configurar la aplicación.
      </p>
    </Card>
  );
}
