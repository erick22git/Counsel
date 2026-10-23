import { describe, it, expect } from "vitest";
import { paDay, dayStartIso, groupTodayTomorrow, upcomingWithin, isUrgent, splitTasks, daysUntil, monthStartDay } from "@/lib/panel/dates";
import { balanceCents, receivableByCurrency, collectedByCurrency } from "@/lib/panel/money";
import { escapeIlike, searchSchema, mergeHits } from "@/lib/panel/search";
import { countByStage } from "@/lib/panel/stages";

// 23/10/2026 15:00 en La Paz = 19:00Z
const now = new Date("2026-10-23T19:00:00Z");

describe("fechas La Paz", () => {
  it("usa el día de La Paz, no UTC", () => {
    expect(paDay("2026-10-24T02:00:00Z")).toBe("2026-10-23");
    expect(paDay("2026-10-24T04:00:00Z")).toBe("2026-10-24");
    expect(dayStartIso("2026-10-23")).toBe("2026-10-23T04:00:00.000Z");
    expect(dayStartIso("2026-10-23", 2)).toBe("2026-10-25T04:00:00.000Z");
    expect(monthStartDay(now)).toBe("2026-10-01");
  });
  it("agrupa hoy y mañana", () => {
    const items = [
      { starts_at: "2026-10-24T13:00:00Z" },
      { starts_at: "2026-10-24T02:00:00Z" },
      { starts_at: "2026-10-23T12:00:00Z" },
      { starts_at: "2026-10-26T12:00:00Z" },
    ];
    const g = groupTodayTomorrow(items, now);
    expect(g.hoy.map((i) => i.starts_at)).toEqual(["2026-10-23T12:00:00Z", "2026-10-24T02:00:00Z"]);
    expect(g.manana).toHaveLength(1);
  });
  it("plazos de la semana y urgencia", () => {
    const items = [
      { starts_at: "2026-10-31T12:00:00Z" },
      { starts_at: "2026-10-30T12:00:00Z" },
      { starts_at: "2026-10-26T12:00:00Z" },
      { starts_at: "2026-10-22T12:00:00Z" },
    ];
    expect(upcomingWithin(items, now).map((i) => daysUntil(i.starts_at, now))).toEqual([3, 7]);
    expect(isUrgent("2026-10-26T12:00:00Z", now)).toBe(true);
    expect(isUrgent("2026-10-27T12:00:00Z", now)).toBe(false);
  });
  it("separa tareas vencidas y de hoy", () => {
    const t = splitTasks(
      [
        { due_at: "2026-10-22T12:00:00Z", done_at: null },
        { due_at: "2026-10-23T23:00:00Z", done_at: null },
        { due_at: "2026-10-23T12:00:00Z", done_at: "2026-10-23T13:00:00Z" },
        { due_at: "2026-10-25T12:00:00Z", done_at: null },
        { due_at: null, done_at: null },
      ],
      now
    );
    expect(t.overdue).toHaveLength(1);
    expect(t.today).toHaveLength(1);
  });
});

describe("saldos en centavos", () => {
  it("evita errores de coma flotante", () => {
    expect(balanceCents([{ quantity: 3, unit_price: 0.1 }], [])).toBe(30);
    expect(balanceCents([{ quantity: 1, unit_price: "100.10" }], [{ amount: "40.05" }])).toBe(6005);
    expect(balanceCents([{ quantity: 1, unit_price: 10 }], [{ amount: 50 }])).toBe(0);
  });
  it("suma por moneda solo enviadas", () => {
    const r = receivableByCurrency([
      { status: "enviada", currency: "BOB", invoice_items: [{ quantity: 1, unit_price: 500 }], payments: [{ amount: 100 }] },
      { status: "enviada", currency: "USD", invoice_items: [{ quantity: 2, unit_price: 50 }], payments: [] },
      { status: "pagada", currency: "BOB", invoice_items: [{ quantity: 1, unit_price: 999 }], payments: [] },
      { status: "borrador", currency: "BOB", invoice_items: [{ quantity: 1, unit_price: 999 }], payments: [] },
    ]);
    expect(r).toEqual({ BOB: 40000, USD: 10000 });
  });
  it("cobrado por moneda", () => {
    expect(
      collectedByCurrency([
        { amount: 10.5, invoices: { currency: "USD" } },
        { amount: 20, invoices: [{ currency: "BOB" }] },
      ])
    ).toEqual({ BOB: 2000, USD: 1050 });
  });
});

describe("búsqueda", () => {
  it("escapa comodines", () => {
    expect(escapeIlike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });
  it("valida q", () => {
    expect(searchSchema.safeParse({ q: "a" }).success).toBe(false);
    expect(searchSchema.safeParse({ q: " ab " }).success).toBe(true);
    expect(searchSchema.safeParse({ q: "x".repeat(81) }).success).toBe(false);
  });
  it("mezcla sin repetir y limita", () => {
    const h = (id: string) => ({ id, label: id, href: "/", group: "g" });
    expect(mergeHits([[h("1"), h("2")], [h("2"), h("3"), h("4"), h("5"), h("6"), h("7")]]).map((x) => x.id)).toEqual(["1", "2", "3", "4", "5"]);
  });
});

describe("etapas", () => {
  it("cuenta sin cerrados", () => {
    const r = countByStage([{ stage: "nuevo" }, { stage: "nuevo" }, { stage: "audiencia" }, { stage: "cerrado" }]);
    expect(r.find((x) => x.id === "nuevo")?.count).toBe(2);
    expect(r.some((x) => x.id === "cerrado")).toBe(false);
  });
});
