import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  buildHref, enumParam, fetchAllRows, fetchPage, MAX_Q, orIlike, PAGE_SIZE, pageMeta, pageRange, paginateArray, parseListParams,
  parsePage, parseQuery, uuidParam, escapeIlike,
} from "@/lib/paginacion";
import { resumenCobros } from "@/lib/paginacion/cobros-resumen";
import { resumenTiempo } from "@/lib/paginacion/tiempo-resumen";

describe("parsePage", () => {
  it("valores normales", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("7")).toBe(7);
    expect(parsePage(" 3 ")).toBe(3);
    expect(parsePage(["4", "9"])).toBe(4);
  });
  it("bordes: 0, negativo, NaN, decimal, texto, vacío, undefined", () => {
    for (const v of ["0", "-1", "-99", "NaN", "abc", "2.5", "", "  ", undefined, "Infinity", "1e999"]) expect(parsePage(v)).toBe(1);
  });
  it("tope máximo", () => {
    expect(parsePage("99999999999")).toBe(1);
    expect(parsePage("100000")).toBe(100000);
  });
});

describe("parseQuery", () => {
  it("recorta, colapsa espacios y quita caracteres de control", () => {
    expect(parseQuery("  hola   mundo ")).toBe("hola mundo");
    expect(parseQuery("a\u0000b\nc")).toBe("a b c");
    expect(parseQuery(undefined)).toBe("");
  });
  it("q muy largo se recorta", () => {
    expect(parseQuery("x".repeat(5000))).toHaveLength(MAX_Q);
  });
  it("conserva % _ \\ (se escapan al armar el patrón)", () => {
    expect(parseQuery("100%_\\")).toBe("100%_\\");
  });
});

describe("parseListParams", () => {
  it("lee página, q, orden y filtros validados", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const r = parseListParams(
      { pagina: "3", q: " Perez ", orden: "antiguos", caso: id, tipo: "pdf" },
      { ordenes: ["recientes", "antiguos"], filters: { caso: uuidParam, tipo: enumParam(["pdf", "word"] as const) } }
    );
    expect(r).toEqual({ page: 3, q: "Perez", orden: "antiguos", filters: { caso: id, tipo: "pdf" } });
  });
  it("valores inválidos caen a los predeterminados", () => {
    const r = parseListParams(
      { pagina: "-5", orden: "hack", caso: "no-uuid", tipo: "exe" },
      { ordenes: ["recientes", "antiguos"], filters: { caso: uuidParam, tipo: enumParam(["pdf"] as const), otro: z.string() } }
    );
    expect(r).toEqual({ page: 1, q: "", orden: "recientes", filters: { caso: "", tipo: "", otro: "" } });
  });
  it("nombres de parámetros propios", () => {
    expect(parseListParams({ p2: "4", busca: "x" }, { pageParam: "p2", qParam: "busca" })).toMatchObject({ page: 4, q: "x" });
  });
});

describe("pageMeta / pageRange", () => {
  it("calcula totalPages y ajusta la página", () => {
    expect(pageMeta(0, 1)).toEqual({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 });
    expect(pageMeta(25, 1).totalPages).toBe(1);
    expect(pageMeta(26, 1).totalPages).toBe(2);
    expect(pageMeta(130, 99).page).toBe(6); // mayor al total → última
    expect(pageMeta(130, 0).page).toBe(1);
    expect(pageMeta(130, -3).page).toBe(1);
    expect(pageMeta(130, NaN).page).toBe(1);
    expect(pageMeta(NaN, 2)).toMatchObject({ total: 0, page: 1 });
  });
  it("rango para supabase.range", () => {
    expect(pageRange(1)).toEqual({ from: 0, to: 24 });
    expect(pageRange(2)).toEqual({ from: 25, to: 49 });
    expect(pageRange(0)).toEqual({ from: 0, to: 24 });
    expect(pageRange(NaN)).toEqual({ from: 0, to: 24 });
    expect(pageRange(3, 10)).toEqual({ from: 20, to: 29 });
  });
  it("paginateArray", () => {
    const items = Array.from({ length: 60 }, (_, i) => i);
    expect(paginateArray(items, 3).rows).toEqual(items.slice(50, 60));
    expect(paginateArray(items, 99).meta.page).toBe(3);
    expect(paginateArray([], 5)).toMatchObject({ rows: [], meta: { page: 1, totalPages: 1 } });
  });
});

describe("fetchPage / fetchAllRows", () => {
  const data = Array.from({ length: 60 }, (_, i) => i);
  const run = async (from: number, to: number) => ({ data: data.slice(from, to + 1), count: data.length });
  it("página normal", async () => {
    const r = await fetchPage(run, 2);
    expect(r.rows).toEqual(data.slice(25, 50));
    expect(r.meta).toMatchObject({ page: 2, total: 60, totalPages: 3 });
  });
  it("página mayor al total → última página", async () => {
    const r = await fetchPage(run, 50);
    expect(r.meta.page).toBe(3);
    expect(r.rows).toEqual(data.slice(50));
  });
  it("sin resultados", async () => {
    const r = await fetchPage(async () => ({ data: [], count: 0 }), 4);
    expect(r.rows).toEqual([]);
    expect(r.meta).toMatchObject({ page: 1, total: 0 });
  });
  it("error de rango de PostgREST (data null) también se recupera", async () => {
    const r = await fetchPage(
      async (from: number, to: number) => (from > 59 ? { data: null, count: null, error: {} } : { data: data.slice(from, to + 1), count: 60 }),
      9
    );
    expect(r.meta.page).toBe(3);
  });
  it("fetchAllRows junta trozos", async () => {
    const all = await fetchAllRows(async (from, to) => ({ data: data.slice(from, to + 1) }), 25);
    expect(all).toEqual(data);
  });
});

describe("orIlike / buildHref", () => {
  it("escapa % _ \\ y comillas; comas y paréntesis quedan dentro de comillas", () => {
    expect(escapeIlike("50%_a\\b")).toBe("50\\%\\_a\\\\b");
    const f = orIlike(["title", "case_number"], 'a,b)"%');
    // patrón ilike: %a,b)"\%%  → con comillas PostgREST: " y \ escapados con \
    expect(f).toBe('title.ilike."%a,b)\\"\\\\%%",case_number.ilike."%a,b)\\"\\\\%%"');
  });
  it("rechaza nombres de columna raros", () => {
    expect(() => orIlike(["title; drop"], "x")).toThrow();
  });
  it("buildHref conserva parámetros y omite vacíos y página 1", () => {
    expect(buildHref("/clientes", { q: "ana", tipo: "" }, 1)).toBe("/clientes?q=ana");
    expect(buildHref("/clientes", { q: "a b&c", pagina: "9" }, 3)).toBe("/clientes?q=a+b%26c&pagina=3");
    expect(buildHref("/x", {}, 1)).toBe("/x");
    expect(buildHref("/c", { q: "z", pagina_consultas: "2" }, 4, "pagina_citas")).toBe("/c?q=z&pagina_consultas=2&pagina_citas=4");
  });
});

describe("agregados independientes de la página", () => {
  it("resumenCobros: por cobrar, vencido y cobrado del mes por moneda", () => {
    const r = resumenCobros(
      [
        { currency: "BOB", due_date: "2026-01-01", items: [{ quantity: 1, unit_price: 100 }], payments: [{ amount: 30 }] }, // vencida, saldo 70
        { currency: "BOB", due_date: "2026-12-31", items: [{ quantity: 2, unit_price: 50 }], payments: [] }, // al día, 100
        { currency: "USD", due_date: null, items: [{ quantity: 1, unit_price: 10 }], payments: [{ amount: 10 }] }, // saldo 0
      ],
      [{ amount: 30, currency: "BOB" }, { amount: "5.5", currency: "USD" }],
      "2026-06-15"
    );
    expect(r.porCobrar).toEqual({ BOB: 17000, USD: 0 });
    expect(r.vencido).toEqual({ BOB: 7000, USD: 0 });
    expect(r.cobradoMes).toEqual({ BOB: 3000, USD: 550 });
  });
  it("resumenTiempo: totales del mes y por día", () => {
    const s = resumenTiempo([
      { case_id: "a", worked_on: "2026-06-02", minutes: 60, billable: true, rate: 120 },
      { case_id: "a", worked_on: "2026-06-02", minutes: 30, billable: false, rate: 120 },
      { case_id: null, worked_on: "2026-06-01", minutes: 15, billable: true, rate: 80 },
    ]);
    expect(s.totalMin).toBe(105);
    expect(s.totalCents).toBe(12000 + 2000);
    expect(s.perCase).toEqual([{ caseId: "a", minutes: 90 }, { caseId: null, minutes: 15 }]);
    expect(s.dayTotals["2026-06-02"]).toEqual({ minutes: 90, amountCents: 12000 });
  });
});
