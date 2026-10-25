import { describe, it, expect } from "vitest";
import { describeEntry, parseAuditParams, pageRange, totalPages, auditQuery, PAGE_SIZE } from "@/lib/auditoria/format";
import { validateInvite, checkRoleChange, checkRemove, friendlyDbError } from "@/lib/equipo/validation";
import { MAX_TEAM_MEMBERS } from "@/lib/equipo/roles";

describe("describeEntry", () => {
  it("cambio de etapa", () => {
    expect(
      describeEntry({ action: "update", entity: "cases", summary: "Pérez vs. Rojas", meta: { actor: "Elena Gómez", changes: { stage: { from: "nuevo", to: "en_tramite" } } } })
    ).toBe("Elena cambió la etapa del caso «Pérez vs. Rojas» de Nuevo a En trámite");
  });
  it("género correcto en facturas", () => {
    expect(
      describeEntry({ action: "update", entity: "invoices", summary: "F-9", meta: { actor: "Luis", changes: { status: { from: "borrador", to: "enviada" } } } })
    ).toBe("Luis cambió el estado de la factura «F-9» de Borrador a Enviada");
  });
  it("crear, eliminar, ver", () => {
    expect(describeEntry({ action: "create", entity: "clients", summary: "Ana", meta: { actor: "Elena" } })).toBe("Elena creó el cliente «Ana»");
    expect(describeEntry({ action: "delete", entity: "payments", summary: "Pago de 25.00", meta: { actor: "Elena" } })).toContain("eliminó definitivamente el pago");
    expect(describeEntry({ action: "view", entity: "documents", summary: "Poder", meta: { actor: "Asia Pérez" } })).toBe("Asia abrió el documento «Poder»");
  });
  it("archivar y restaurar", () => {
    const base = { action: "update", entity: "cases", summary: "X", meta: { actor: "E", changes: { deleted_at: { from: null, to: "2026-01-01" } } } };
    expect(describeEntry(base)).toBe("E archivó el caso «X»");
    expect(describeEntry({ ...base, meta: { actor: "E", changes: { deleted_at: { from: "2026-01-01", to: null } } } })).toBe("E restauró el caso «X»");
  });
  it("varios campos y campos desconocidos", () => {
    const t = describeEntry({ action: "update", entity: "cases", summary: "X", meta: { actor: "E", changes: { title: { from: "a", to: "b" }, court: { from: null, to: "c" } } } });
    expect(t).toBe("E modificó el caso «X» (título, juzgado)");
    expect(describeEntry({ action: "update", entity: "cases", summary: "X", meta: { actor: "E", changes: { zzz_campo: { from: "1", to: "2" } } } })).toContain("zzz campo");
  });
  it("equipo", () => {
    expect(describeEntry({ action: "update", entity: "profiles", summary: "Luis", meta: { actor: "Elena", changes: { role: { from: "assistant", to: "lawyer" } } } })).toBe(
      "Elena cambió el rol del miembro del equipo «Luis» de Asistente a Abogado"
    );
    expect(describeEntry({ action: "update", entity: "profiles", summary: "Luis", meta: { actor: "Elena", changes: { active: { from: "true", to: "false" } } } })).toBe("Elena quitó el acceso a «Luis»");
  });
  it("sin actor", () => {
    expect(describeEntry({ action: "create", entity: "cases", summary: "X", meta: {} })).toBe("Alguien creó el caso «X»");
  });
});

describe("parámetros de auditoría", () => {
  it("valores por defecto y saneamiento", () => {
    expect(parseAuditParams({})).toEqual({ pagina: 1, q: "", usuario: null, entidad: null, desde: null, hasta: null });
    const p = parseAuditParams({ pagina: "-4", q: "a,b(c)%*\"x", usuario: "no-uuid", entidad: "otra", desde: "ayer", hasta: "2026-02-01" });
    expect(p.pagina).toBe(1);
    expect(p.q).toBe("a b c x");
    expect(p.usuario).toBeNull();
    expect(p.entidad).toBeNull();
    expect(p.desde).toBeNull();
    expect(p.hasta).toBe("2026-02-01");
  });
  it("acepta valores válidos y arreglos", () => {
    const u = "11111111-1111-4111-8111-111111111111";
    const p = parseAuditParams({ pagina: ["3", "9"], usuario: u, entidad: "cases" });
    expect(p).toMatchObject({ pagina: 3, usuario: u, entidad: "cases" });
  });
  it("paginación de 25", () => {
    expect(PAGE_SIZE).toBe(25);
    expect(pageRange(1)).toEqual({ from: 0, to: 24 });
    expect(pageRange(3)).toEqual({ from: 50, to: 74 });
    expect(totalPages(0)).toBe(1);
    expect(totalPages(25)).toBe(1);
    expect(totalPages(26)).toBe(2);
  });
  it("auditQuery conserva filtros", () => {
    expect(auditQuery({ q: "caso", entidad: "cases", pagina: 2 }, { pagina: 3 })).toBe("?q=caso&entidad=cases&pagina=3");
    expect(auditQuery({}, { pagina: 1 })).toBe("");
  });
});

describe("validación de invitaciones", () => {
  const ctx = { activeMembers: 3, existingEmails: ["ya@demo.bo"] };
  it("acepta datos válidos y normaliza el correo", () => {
    const r = validateInvite({ full_name: " Luis Ríos ", email: "LUIS@Demo.bo", role: "lawyer" }, ctx);
    expect(r).toEqual({ ok: true, data: { full_name: "Luis Ríos", email: "luis@demo.bo", role: "lawyer" } });
  });
  it("rechaza rol client o desconocido", () => {
    expect(validateInvite({ full_name: "Luis", email: "l@demo.bo", role: "client" }, ctx).ok).toBe(false);
    expect(validateInvite({ full_name: "Luis", email: "l@demo.bo", role: "admin" }, ctx).ok).toBe(false);
  });
  it("rechaza correo inválido, nombre corto, correo repetido", () => {
    expect(validateInvite({ full_name: "Luis", email: "no-es-correo", role: "lawyer" }, ctx)).toMatchObject({ ok: false });
    expect(validateInvite({ full_name: "L", email: "l@demo.bo", role: "lawyer" }, ctx)).toMatchObject({ ok: false });
    expect(validateInvite({ full_name: "Luis", email: "YA@demo.bo", role: "lawyer" }, ctx)).toMatchObject({ ok: false });
  });
  it("límite de miembros", () => {
    const r = validateInvite({ full_name: "Luis", email: "l@demo.bo", role: "assistant" }, { ...ctx, activeMembers: MAX_TEAM_MEMBERS });
    expect(r).toMatchObject({ ok: false });
    expect(validateInvite({ full_name: "Luis", email: "l@demo.bo", role: "assistant" }, { ...ctx, activeMembers: MAX_TEAM_MEMBERS - 1 }).ok).toBe(true);
  });
  it("último titular", () => {
    const m = [
      { id: "a", role: "owner" as const, active: true },
      { id: "b", role: "lawyer" as const, active: true },
    ];
    expect(checkRoleChange(m, "a", "lawyer").ok).toBe(false);
    expect(checkRoleChange(m, "b", "assistant").ok).toBe(true);
    expect(checkRemove(m, "a", "b").ok).toBe(false);
    expect(checkRemove(m, "b", "b").ok).toBe(false);
    expect(checkRemove(m, "b", "a").ok).toBe(true);
    expect(checkRoleChange([...m, { id: "c", role: "owner", active: true }], "a", "lawyer").ok).toBe(true);
  });
  it("friendlyDbError no filtra errores internos", () => {
    expect(friendlyDbError('relation "x" does not exist')).toBe("No se pudo completar. Intenta de nuevo.");
    expect(friendlyDbError("No puedes cambiar el rol del último titular")).toContain("último titular");
  });
});
