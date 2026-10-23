import { describe, it, expect } from "vitest";
import {
  toCents, fromCents, round2, lineCents, itemsTotal, itemsTotalCents, paymentsTotalCents, balance, balanceCents,
  formatInvoiceNumber, nextInvoiceNumber,
} from "@/lib/cobros/money";
import { derivedStatus, todayLaPaz, isReceivable, methodLabel, STATUS_LABEL } from "@/lib/cobros/status";
import {
  minutesToHours, entryAmount, entryAmountCents, hoursToItems, formatClock, secondsToMinutes, hoursMinutesToMinutes,
  parseTimerState, groupByDay, minutesByCase,
} from "@/lib/cobros/time";
import { invoiceSchema, paymentSchema, timeEntrySchema, itemSchema } from "@/lib/cobros/schemas";

const U = "11111111-1111-4111-8111-111111111111";

describe("dinero en centavos", () => {
  it("evita errores de punto flotante", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(fromCents(toCents(0.1) + toCents(0.2))).toBe(0.3);
    expect(round2(1.1 * 3)).toBe(3.3);
  });
  it("toCents redondea a la mitad hacia arriba", () => {
    expect(toCents(1.005)).toBe(101);
    expect(toCents(2.675)).toBe(268);
    expect(toCents(12.345)).toBe(1235);
    expect(toCents(0)).toBe(0);
    expect(toCents(10)).toBe(1000);
  });
  it("acepta cadenas con coma y valores raros", () => {
    expect(toCents("12,50")).toBe(1250);
    expect(toCents("abc")).toBe(0);
    expect(toCents(null)).toBe(0);
    expect(toCents(undefined)).toBe(0);
    expect(toCents(NaN)).toBe(0);
    expect(toCents(Infinity)).toBe(0);
  });
  it("maneja negativos de forma simétrica", () => {
    expect(toCents(-1.005)).toBe(-101);
    expect(round2(-0.1 - 0.2)).toBe(-0.3);
  });
  it("round2 con valores grandes", () => {
    expect(round2(1234567.891)).toBe(1234567.89);
    expect(round2(99999999.995)).toBe(100000000);
  });
});

describe("totales de ítems", () => {
  it("línea = cantidad × precio", () => {
    expect(lineCents(2, 150)).toBe(30000);
    expect(lineCents(1.5, 200)).toBe(30000);
    expect(lineCents(0.83, 300)).toBe(24900);
    expect(lineCents(3, 0.1)).toBe(30);
    expect(lineCents(1, 0)).toBe(0);
  });
  it("redondea la línea al centavo", () => {
    expect(lineCents(0.33, 0.1)).toBe(3); // 0.033 -> 3 centavos
    expect(lineCents(0.5, 0.01)).toBe(1); // 0.005 -> 1 centavo
    expect(lineCents(1.25, 3.33)).toBe(416); // 4.1625 -> 4.16
  });
  it("suma de ítems exacta", () => {
    const items = [
      { quantity: 3, unit_price: 0.1 },
      { quantity: 3, unit_price: 0.2 },
    ];
    expect(itemsTotal(items)).toBe(0.9);
    expect(itemsTotalCents(items)).toBe(90);
    expect(itemsTotal([])).toBe(0);
  });
  it("acepta cadenas (numeric de Postgres llega como texto)", () => {
    expect(itemsTotal([{ quantity: "2.00", unit_price: "150.50" }])).toBe(301);
  });
  it("muchos ítems pequeños no acumulan error", () => {
    const items = Array.from({ length: 1000 }, () => ({ quantity: 1, unit_price: 0.1 }));
    expect(itemsTotal(items)).toBe(100);
  });
});

describe("pagos y saldo", () => {
  const items = [{ quantity: 2, unit_price: 500 }];
  it("saldo sin pagos = total", () => {
    expect(balance(items, [])).toBe(1000);
  });
  it("saldo con pagos parciales", () => {
    expect(balance(items, [{ amount: 300.1 }, { amount: "199.9" }])).toBe(500);
    expect(paymentsTotalCents([{ amount: 0.1 }, { amount: 0.2 }])).toBe(30);
  });
  it("saldo cero al cubrir el total", () => {
    expect(balanceCents(items, [{ amount: 1000 }])).toBe(0);
  });
  it("saldo nunca negativo si hay sobrepago", () => {
    expect(balanceCents(items, [{ amount: 1200 }])).toBe(0);
  });
});

describe("numeración correlativa", () => {
  it("formatea con ceros", () => {
    expect(formatInvoiceNumber(1)).toBe("F-0001");
    expect(formatInvoiceNumber(42)).toBe("F-0042");
    expect(formatInvoiceNumber(12345)).toBe("F-12345");
    expect(formatInvoiceNumber(-3)).toBe("F-0000");
  });
  it("el primero es F-0001", () => {
    expect(nextInvoiceNumber([])).toBe("F-0001");
  });
  it("toma el máximo, no la cantidad", () => {
    expect(nextInvoiceNumber(["F-0001", "F-0007", "F-0003"])).toBe("F-0008");
  });
  it("ignora formatos distintos y nulos", () => {
    expect(nextInvoiceNumber(["X-0100", "abc", null, undefined, "F-0002"])).toBe("F-0003");
  });
  it("pasa de 9999 sin romperse", () => {
    expect(nextInvoiceNumber(["F-9999"])).toBe("F-10000");
    expect(nextInvoiceNumber(["F-10000"])).toBe("F-10001");
  });
  it("prefijo propio", () => {
    expect(nextInvoiceNumber(["C-0004"], "C")).toBe("C-0005");
  });
});

describe("estado derivado 'vencida'", () => {
  const today = "2026-10-23";
  it("enviada con saldo y vencimiento pasado = vencida", () => {
    expect(derivedStatus({ status: "enviada", due_date: "2026-10-22" }, 100, today)).toBe("vencida");
  });
  it("el mismo día del vencimiento aún no está vencida", () => {
    expect(derivedStatus({ status: "enviada", due_date: today }, 100, today)).toBe("enviada");
  });
  it("sin vencimiento nunca vence", () => {
    expect(derivedStatus({ status: "enviada", due_date: null }, 100, today)).toBe("enviada");
  });
  it("sin saldo no está vencida", () => {
    expect(derivedStatus({ status: "enviada", due_date: "2020-01-01" }, 0, today)).toBe("enviada");
  });
  it("pagada, anulada y borrador no cambian", () => {
    expect(derivedStatus({ status: "pagada", due_date: "2020-01-01" }, 0, today)).toBe("pagada");
    expect(derivedStatus({ status: "anulada", due_date: "2020-01-01" }, 100, today)).toBe("anulada");
    expect(derivedStatus({ status: "borrador", due_date: "2020-01-01" }, 100, today)).toBe("borrador");
  });
  it("todas las etiquetas existen", () => {
    expect(STATUS_LABEL.vencida).toBe("Vencida");
    expect(STATUS_LABEL.borrador).toBe("Borrador");
  });
  it("por cobrar solo cuenta enviadas", () => {
    expect(isReceivable("enviada")).toBe(true);
    expect(isReceivable("borrador")).toBe(false);
    expect(isReceivable("pagada")).toBe(false);
    expect(isReceivable("anulada")).toBe(false);
  });
  it("hoy en La Paz (UTC-4)", () => {
    expect(todayLaPaz(new Date("2026-10-23T02:00:00Z"))).toBe("2026-10-22");
    expect(todayLaPaz(new Date("2026-10-23T04:00:00Z"))).toBe("2026-10-23");
    expect(todayLaPaz(new Date("2026-10-23T23:59:00Z"))).toBe("2026-10-23");
  });
  it("método de pago", () => {
    expect(methodLabel("qr")).toBe("QR");
    expect(methodLabel("xyz")).toBe("xyz");
  });
});

describe("tiempo", () => {
  it("minutos a horas decimales", () => {
    expect(minutesToHours(90)).toBe(1.5);
    expect(minutesToHours(50)).toBe(0.83);
    expect(minutesToHours(1)).toBe(0.02);
    expect(minutesToHours(0)).toBe(0);
  });
  it("monto por entrada", () => {
    expect(entryAmount(60, 300)).toBe(300);
    expect(entryAmount(30, 300)).toBe(150);
    expect(entryAmount(50, 300)).toBe(250);
    expect(entryAmountCents(7, 100)).toBe(1167);
    expect(entryAmount(90, 0)).toBe(0);
  });
  it("horas pendientes a ítems", () => {
    const items = hoursToItems([
      { id: "a", description: "Redacción de memorial", minutes: 90, rate: "200.00", worked_on: "2026-10-05" },
      { id: "b", description: null, minutes: 30, rate: 200 },
    ]);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ description: "Redacción de memorial (05/10/2026)", quantity: 1.5, unit_price: 200, time_entry_id: "a" });
    expect(items[1].description).toBe("Horas de trabajo");
    expect(itemsTotal(items)).toBe(400);
    expect(hoursToItems([])).toEqual([]);
  });
  it("cronómetro", () => {
    expect(formatClock(0)).toBe("0:00:00");
    expect(formatClock(65)).toBe("0:01:05");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-5)).toBe("0:00:00");
    expect(formatClock(59.9)).toBe("0:00:59");
  });
  it("segundos a minutos redondea hacia arriba con mínimo 1", () => {
    expect(secondsToMinutes(0)).toBe(1);
    expect(secondsToMinutes(5)).toBe(1);
    expect(secondsToMinutes(60)).toBe(1);
    expect(secondsToMinutes(61)).toBe(2);
    expect(secondsToMinutes(3600)).toBe(60);
  });
  it("horas y minutos a minutos", () => {
    expect(hoursMinutesToMinutes(1, 30)).toBe(90);
    expect(hoursMinutesToMinutes("2", "")).toBe(120);
    expect(hoursMinutesToMinutes("", "45")).toBe(45);
    expect(hoursMinutesToMinutes(0.5, 0)).toBe(30);
  });
  it("estado del timer guardado", () => {
    expect(parseTimerState(null)).toBeNull();
    expect(parseTimerState("no es json")).toBeNull();
    expect(parseTimerState("{}")).toBeNull();
    expect(parseTimerState('{"startedAt":"x"}')).toBeNull();
    expect(parseTimerState('{"startedAt":1000,"caseId":"c","description":"d"}')).toEqual({ startedAt: 1000, caseId: "c", description: "d" });
    expect(parseTimerState('{"startedAt":1000}')).toEqual({ startedAt: 1000, caseId: "", description: "" });
  });
  it("agrupa por día, más reciente primero, con totales", () => {
    const g = groupByDay([
      { worked_on: "2026-10-01", minutes: 60, billable: true, rate: 100 },
      { worked_on: "2026-10-03", minutes: 30, billable: true, rate: 200 },
      { worked_on: "2026-10-01", minutes: 30, billable: false, rate: 100 },
    ]);
    expect(g.map((d) => d.day)).toEqual(["2026-10-03", "2026-10-01"]);
    expect(g[1].minutes).toBe(90);
    expect(g[1].amountCents).toBe(10000); // la no facturable no suma
    expect(g[0].amountCents).toBe(10000);
    expect(groupByDay([])).toEqual([]);
  });
  it("minutos por caso ordenados", () => {
    const r = minutesByCase([
      { case_id: "a", minutes: 10 },
      { case_id: null, minutes: 50 },
      { case_id: "a", minutes: 20 },
    ]);
    expect(r).toEqual([
      { caseId: null, minutes: 50 },
      { caseId: "a", minutes: 30 },
    ]);
  });
});

describe("validación zod", () => {
  const base = {
    client_id: U,
    currency: "BOB" as const,
    issue_date: "2026-10-01",
    due_date: "2026-10-31",
    items: [{ description: "Honorarios", quantity: 1, unit_price: 500 }],
  };
  it("acepta un cobro válido y completa valores por defecto", () => {
    const r = invoiceSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.time_entry_ids).toEqual([]);
  });
  it("rechaza sin ítems", () => {
    expect(invoiceSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });
  it("rechaza cantidad 0 o negativa y precio negativo", () => {
    expect(itemSchema.safeParse({ description: "x", quantity: 0, unit_price: 1 }).success).toBe(false);
    expect(itemSchema.safeParse({ description: "x", quantity: -1, unit_price: 1 }).success).toBe(false);
    expect(itemSchema.safeParse({ description: "x", quantity: 1, unit_price: -1 }).success).toBe(false);
  });
  it("rechaza descripción vacía", () => {
    expect(itemSchema.safeParse({ description: "   ", quantity: 1, unit_price: 1 }).success).toBe(false);
  });
  it("rechaza total 0", () => {
    expect(invoiceSchema.safeParse({ ...base, items: [{ description: "x", quantity: 1, unit_price: 0 }] }).success).toBe(false);
  });
  it("rechaza vencimiento anterior a la fecha", () => {
    expect(invoiceSchema.safeParse({ ...base, due_date: "2026-09-01" }).success).toBe(false);
    expect(invoiceSchema.safeParse({ ...base, due_date: null }).success).toBe(true);
  });
  it("rechaza moneda y cliente inválidos", () => {
    expect(invoiceSchema.safeParse({ ...base, currency: "EUR" }).success).toBe(false);
    expect(invoiceSchema.safeParse({ ...base, client_id: "no" }).success).toBe(false);
  });
  it("pago: monto > 0 y método válido", () => {
    const p = { invoice_id: U, amount: 100, method: "qr", paid_on: "2026-10-02" };
    expect(paymentSchema.safeParse(p).success).toBe(true);
    expect(paymentSchema.safeParse({ ...p, amount: 0 }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...p, amount: -5 }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...p, amount: 0.004 }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...p, method: "bitcoin" }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...p, paid_on: "02/10/2026" }).success).toBe(false);
  });
  it("tiempo: minutos enteros 1..1440, tarifa >= 0", () => {
    const t = { minutes: 30, worked_on: "2026-10-02", billable: true, rate: 100 };
    expect(timeEntrySchema.safeParse(t).success).toBe(true);
    expect(timeEntrySchema.safeParse({ ...t, minutes: 0 }).success).toBe(false);
    expect(timeEntrySchema.safeParse({ ...t, minutes: 1.5 }).success).toBe(false);
    expect(timeEntrySchema.safeParse({ ...t, minutes: 1441 }).success).toBe(false);
    expect(timeEntrySchema.safeParse({ ...t, rate: -1 }).success).toBe(false);
    expect(timeEntrySchema.safeParse({ ...t, case_id: "x" }).success).toBe(false);
    expect(timeEntrySchema.safeParse({ ...t, case_id: null }).success).toBe(true);
  });
});
