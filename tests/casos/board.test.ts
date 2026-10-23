import { describe, it, expect } from "vitest";
import {
  positionBetween, groupByStage, positionAtIndex, planMove, planMoveToStageEnd, needsRebalance, rebalance, applyPlan,
} from "@/lib/casos/board";
import { filterCases, filterClients, nextAppointmentByCase, norm } from "@/lib/casos/filters";
import { caseSchema, clientSchema } from "@/lib/casos/schemas";
import type { Stage } from "@/lib/db/types";

const c = (id: string, stage: Stage, position: number) => ({ id, stage, position });

describe("positionBetween", () => {
  it("usa el punto medio entre vecinos", () => expect(positionBetween(1000, 2000)).toBe(1500));
  it("al inicio resta un paso", () => expect(positionBetween(null, 1000)).toBe(0));
  it("al final suma un paso", () => expect(positionBetween(3000, null)).toBe(4000));
  it("columna vacía", () => expect(positionBetween(null, null)).toBe(1000));
});

describe("groupByStage", () => {
  it("devuelve las 5 etapas y ordena por position", () => {
    const g = groupByStage([c("b", "nuevo", 2), c("a", "nuevo", 1), c("z", "cerrado", 5)]);
    expect(Object.keys(g)).toEqual(["nuevo", "en_tramite", "audiencia", "resolucion", "cerrado"]);
    expect(g.nuevo.map((x) => x.id)).toEqual(["a", "b"]);
    expect(g.audiencia).toEqual([]);
    expect(g.cerrado).toHaveLength(1);
  });
  it("desempata por id", () => {
    expect(groupByStage([c("b", "nuevo", 0), c("a", "nuevo", 0)]).nuevo.map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("positionAtIndex", () => {
  const col = [{ position: 10 }, { position: 20 }, { position: 30 }];
  it("al inicio", () => expect(positionAtIndex(col, 0)).toBeLessThan(10));
  it("en medio", () => expect(positionAtIndex(col, 1)).toBe(15));
  it("al final", () => expect(positionAtIndex(col, 3)).toBe(1030));
  it("índice fuera de rango se acota", () => expect(positionAtIndex(col, 99)).toBe(1030));
});

describe("planMove", () => {
  const cases = [c("a", "nuevo", 1000), c("b", "nuevo", 2000), c("c", "nuevo", 3000), c("d", "en_tramite", 1000), c("e", "en_tramite", 2000)];

  it("a otra columna sobre una tarjeta: se inserta antes", () => {
    const p = planMove(cases, "a", { stage: "en_tramite", overId: "e" })!;
    expect(p).toMatchObject({ stage: "en_tramite", fromStage: "nuevo", index: 1, position: 1500, changed: true });
  });
  it("a otra columna vacía", () => {
    const p = planMove(cases, "a", { stage: "audiencia" })!;
    expect(p.position).toBe(1000);
    expect(p.index).toBe(0);
  });
  it("al final de otra columna", () => {
    expect(planMove(cases, "a", { stage: "en_tramite" })!.position).toBe(3000);
  });
  it("misma columna hacia abajo toma el lugar de la tarjeta destino", () => {
    const p = planMove(cases, "a", { stage: "nuevo", overId: "c" })!;
    expect(p.index).toBe(2);
    expect(p.position).toBe(4000); // después de c (último)
    expect(p.changed).toBe(true);
  });
  it("misma columna hacia arriba", () => {
    const p = planMove(cases, "c", { stage: "nuevo", overId: "a" })!;
    expect(p.index).toBe(0);
    expect(p.position).toBe(0);
  });
  it("soltar sobre sí misma no cambia nada", () => {
    expect(planMove(cases, "b", { stage: "nuevo", overId: "b" })!.changed).toBe(false);
  });
  it("caso inexistente", () => expect(planMove(cases, "zzz", { stage: "nuevo" })).toBeNull());
  it("mover a etapa (menú) va al final", () => {
    const p = planMoveToStageEnd(cases, "a", "cerrado")!;
    expect(p).toMatchObject({ stage: "cerrado", position: 1000, changed: true });
  });
  it("aplicar el plan actualiza la tarjeta y mantiene el orden", () => {
    const p = planMove(cases, "a", { stage: "en_tramite", overId: "e" })!;
    const next = applyPlan(cases, "a", p);
    expect(groupByStage(next).en_tramite.map((x) => x.id)).toEqual(["d", "a", "e"]);
    expect(groupByStage(next).nuevo.map((x) => x.id)).toEqual(["b", "c"]);
  });
});

describe("rebalance", () => {
  it("detecta vecinos pegados", () => {
    expect(needsRebalance([{ position: 1 }, { position: 1 + 1e-9 }])).toBe(true);
    expect(needsRebalance([{ position: 1 }, { position: 2 }])).toBe(false);
  });
  it("renumera de 1000 en 1000", () => {
    expect(rebalance([{ id: "a" }, { id: "b" }])).toEqual([{ id: "a", position: 1000 }, { id: "b", position: 2000 }]);
  });
  it("muchas inserciones en el mismo hueco siguen siendo ordenables", () => {
    let lo = 1000;
    const hi = 2000;
    for (let i = 0; i < 30; i++) lo = positionBetween(lo, hi);
    expect(lo).toBeGreaterThan(1000);
    expect(lo).toBeLessThan(hi);
  });
});

describe("filtros", () => {
  it("norm quita tildes y mayúsculas", () => expect(norm("  Ñandú Pérez ")).toBe("nandu perez"));
  const cases = [
    { title: "Divorcio Pérez", case_number: "123/2025", matter: "familia", client_id: "1", opponent: "Ana" },
    { title: "Cobro de deuda", case_number: null, matter: "civil", client_id: "2", opponent: null },
  ];
  const clientName = (id: string) => (id === "1" ? "María Pérez" : "Empresa Andina");
  it("por texto (cliente, título, expediente)", () => {
    expect(filterCases(cases, { text: "perez", matter: "", clientName })).toHaveLength(1);
    expect(filterCases(cases, { text: "123/2025", matter: "", clientName })).toHaveLength(1);
    expect(filterCases(cases, { text: "andina", matter: "", clientName })[0].title).toBe("Cobro de deuda");
  });
  it("por materia", () => expect(filterCases(cases, { text: "", matter: "civil", clientName })).toHaveLength(1));
  it("clientes por nombre o CI/NIT", () => {
    const cl = [{ full_name: "José Mamani", ci_nit: "1234567" }, { full_name: "Textil SRL", ci_nit: "102030" }];
    expect(filterClients(cl, "jose")).toHaveLength(1);
    expect(filterClients(cl, "1020")[0].full_name).toBe("Textil SRL");
    expect(filterClients(cl, "")).toHaveLength(2);
  });
});

describe("nextAppointmentByCase", () => {
  const now = new Date("2026-01-10T12:00:00Z");
  const a = (case_id: string | null, starts_at: string, status = "programada") => ({ case_id, starts_at, status });
  it("elige el más cercano a futuro, ignora pasados/cancelados/sin caso", () => {
    const m = nextAppointmentByCase(
      [a("x", "2026-01-20T10:00:00Z"), a("x", "2026-01-12T10:00:00Z"), a("x", "2026-01-01T10:00:00Z"), a("x", "2026-01-11T10:00:00Z", "cancelada"), a(null, "2026-01-11T10:00:00Z")],
      now
    );
    expect(m.get("x")!.starts_at).toBe("2026-01-12T10:00:00Z");
    expect(m.size).toBe(1);
  });
});

describe("schemas", () => {
  it("cliente: vacíos pasan a null y valida correo", () => {
    const r = clientSchema.parse({ kind: "persona", full_name: "Juan Rojas", email: "", phone: " ", ci_nit: "123" });
    expect(r.email).toBeNull();
    expect(r.phone).toBeNull();
    expect(clientSchema.safeParse({ kind: "persona", full_name: "Juan Rojas", email: "malo" }).success).toBe(false);
  });
  it("caso: exige cliente uuid y materia válida", () => {
    expect(caseSchema.safeParse({ title: "Caso", client_id: "x", matter: "civil" }).success).toBe(false);
    expect(caseSchema.safeParse({ title: "Caso", client_id: "7b0e6a1e-0b1c-4c0e-9a55-3f1d2c4e5a6b", matter: "civil" }).success).toBe(true);
  });
});
