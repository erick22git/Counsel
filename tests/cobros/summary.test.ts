import { describe, it, expect } from "vitest";
import { toView, summarize, filterViews, type InvoiceRow } from "@/lib/cobros/summary";

const today = "2026-10-23";
const row = (o: Partial<InvoiceRow>): InvoiceRow => ({
  id: "i", number: "F-0001", status: "enviada", currency: "BOB", issue_date: "2026-10-01", due_date: null,
  client_id: "c1", case_id: null, client_name: "Cliente Demo", case_title: null,
  items: [{ quantity: 1, unit_price: 1000 }], payments: [], ...o,
});

describe("resumen de cobros", () => {
  it("toView calcula total, saldo y estado derivado", () => {
    const v = toView(row({ due_date: "2026-10-10", payments: [{ amount: 250.5, paid_on: "2026-10-05" }] }), today);
    expect(v.total_cents).toBe(100000);
    expect(v.balance_cents).toBe(74950);
    expect(v.display).toBe("vencida");
  });
  it("anulada tiene saldo 0", () => {
    expect(toView(row({ status: "anulada" }), today).balance_cents).toBe(0);
  });
  it("por cobrar, vencido y cobrado del mes por moneda", () => {
    const views = [
      toView(row({ id: "1", due_date: "2026-10-30" }), today),
      toView(row({ id: "2", due_date: "2026-10-01", items: [{ quantity: 2, unit_price: 100 }] }), today),
      toView(row({ id: "3", currency: "USD", items: [{ quantity: 1, unit_price: 50 }] }), today),
      toView(row({ id: "4", status: "borrador" }), today),
      toView(row({ id: "5", status: "anulada", payments: [{ amount: 500, paid_on: "2026-10-02" }] }), today),
      toView(row({ id: "6", status: "pagada", payments: [{ amount: 1000, paid_on: "2026-10-02" }, { amount: 10, paid_on: "2026-09-30" }] }), today),
    ];
    const s = summarize(views, today);
    expect(s.porCobrar).toEqual({ BOB: 100000 + 20000, USD: 5000 });
    expect(s.vencido).toEqual({ BOB: 20000, USD: 0 });
    expect(s.cobradoMes).toEqual({ BOB: 100000, USD: 0 });
  });
  it("sin datos todo es cero", () => {
    expect(summarize([], today)).toEqual({ porCobrar: { BOB: 0, USD: 0 }, vencido: { BOB: 0, USD: 0 }, cobradoMes: { BOB: 0, USD: 0 } });
  });
  it("filtra por estado derivado y cliente", () => {
    const views = [
      toView(row({ id: "1", due_date: "2026-10-01" }), today),
      toView(row({ id: "2", client_id: "c2" }), today),
      toView(row({ id: "3", status: "pagada" }), today),
    ];
    expect(filterViews(views, { estado: "vencida" }).map((v) => v.id)).toEqual(["1"]);
    expect(filterViews(views, { cliente: "c2" }).map((v) => v.id)).toEqual(["2"]);
    expect(filterViews(views, { estado: "enviada", cliente: "c1" })).toHaveLength(0);
    expect(filterViews(views, {})).toHaveLength(3);
  });
});
