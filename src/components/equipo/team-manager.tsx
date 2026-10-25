"use client";
import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Pill } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { fail, ok, toastWithUndo } from "@/components/ui/undo-toast";
import { changeMemberRole, inviteMember, removeMember, restoreMember } from "@/app/(app)/ajustes/equipo/actions";
import { ASSIGNABLE_ROLES, ROLE_HINTS, ROLE_LABELS, roleLabel, roleTone, type StaffRole } from "@/lib/equipo/roles";

export interface MemberRow {
  id: string;
  full_name: string;
  email: string | null;
  role: StaffRole;
  active: boolean;
}

export function TeamManager({ members, meId, isOwner, max }: { members: MemberRow[]; meId: string; isOwner: boolean; max: number }) {
  const active = members.filter((m) => m.active);
  const removed = members.filter((m) => !m.active);
  const full = active.length >= max;

  return (
    <div className="grid gap-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-2">
          {active.length} de {max} personas en tu equipo.
        </p>
        {isOwner && <InviteDialog disabled={full} />}
      </div>
      {isOwner && full && (
        <p className="text-ink-2">Llegaste al máximo de {max} personas. Quita a alguien para invitar a otra.</p>
      )}

      {active.length === 0 ? (
        <EmptyState title="Aún no hay equipo" description="Invita a tu primer colega para trabajar juntos." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {active.map((m) => (
              <MemberItem key={m.id} m={m} isMe={m.id === meId} isOwner={isOwner} />
            ))}
          </ul>
        </Card>
      )}

      {isOwner && removed.length > 0 && (
        <Card>
          <h2 className="text-[length:var(--text-heading-sm)]">Personas quitadas</h2>
          <p className="mt-1 text-ink-2">No pueden entrar al sistema. Puedes devolverles el acceso.</p>
          <ul className="mt-3 divide-y divide-line">
            {removed.map((m) => (
              <RemovedItem key={m.id} m={m} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function MemberItem({ m, isMe, isOwner }: { m: MemberRow; isMe: boolean; isOwner: boolean }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  function onRole(role: string) {
    start(async () => {
      const r = await changeMemberRole(m.id, role);
      if (r.ok) ok(`Ahora ${m.full_name} es ${roleLabel(role).toLowerCase()}.`);
      else fail(r.error);
    });
  }
  function onRemove() {
    start(async () => {
      const r = await removeMember(m.id);
      setOpen(false);
      if (!r.ok) {
        fail(r.error);
        return;
      }
      toastWithUndo(`${m.full_name} ya no tiene acceso.`, async () => {
        const u = await restoreMember(m.id);
        if (!u.ok) fail(u.error);
      });
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4">
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-medium">
          {m.full_name} {isMe && <span className="text-ink-3 font-normal">(tú)</span>}
        </p>
        <p className="truncate text-ink-3 text-[length:var(--text-body-sm)]">{m.email ?? "Sin correo"}</p>
      </div>
      <Pill tone={roleTone(m.role)}>{ROLE_LABELS[m.role]}</Pill>
      {isOwner && (
        <>
          <Select
            aria-label={`Cambiar rol de ${m.full_name}`}
            value={m.role}
            disabled={pending}
            onChange={(e) => onRole(e.target.value)}
            className="w-40"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
          {!isMe && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={pending}>
                  Quitar
                </Button>
              </DialogTrigger>
              <DialogContent
                title={`¿Quitar a ${m.full_name}?`}
                description="Dejará de ver casos, clientes y documentos de tu despacho. No se borra nada de lo que hizo y puedes devolverle el acceso cuando quieras."
              >
                <div className="flex flex-wrap justify-end gap-3">
                  <DialogClose asChild>
                    <Button variant="outline">No, cancelar</Button>
                  </DialogClose>
                  <Button variant="danger" onClick={onRemove} disabled={pending}>
                    Sí, quitar acceso
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
    </li>
  );
}

function RemovedItem({ m }: { m: MemberRow }) {
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div>
        <p className="font-medium">{m.full_name}</p>
        <p className="text-ink-3 text-[length:var(--text-body-sm)]">
          {m.email ?? "Sin correo"} · {ROLE_LABELS[m.role]}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await restoreMember(m.id);
            if (r.ok) ok(`${m.full_name} volvió al equipo.`);
            else fail(r.error);
          })
        }
      >
        Devolver acceso
      </Button>
    </li>
  );
}

function InviteDialog({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<StaffRole>("lawyer");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null);
    start(async () => {
      const r = await inviteMember({ full_name: f.get("full_name"), email: f.get("email"), role });
      if (r.ok) {
        ok("Listo. Enviamos la invitación por correo.");
        setOpen(false);
      } else setError(r.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" disabled={disabled}>
          <UserPlus size={20} aria-hidden /> Invitar colega
        </Button>
      </DialogTrigger>
      <DialogContent title="Invitar a un colega" description="Le llegará un correo para crear su clave y entrar.">
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label="Nombre completo" htmlFor="inv-name">
            <Input id="inv-name" name="full_name" required minLength={2} maxLength={120} autoComplete="off" />
          </Field>
          <Field label="Correo" htmlFor="inv-email">
            <Input id="inv-email" name="email" type="email" required maxLength={200} autoComplete="off" />
          </Field>
          <Field label="Rol" htmlFor="inv-role" hint={ROLE_HINTS[role]}>
            <Select id="inv-role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? "Enviando…" : "Enviar invitación"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
