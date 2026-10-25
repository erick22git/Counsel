import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createDb } from "./harness";

let db: PGlite;
beforeAll(async () => {
  db = await createDb();
});

/** FK sin índice, con justificación escrita. Debe quedar vacío. */
const FK_WITHOUT_INDEX: Record<string, string> = {};

describe("índices", () => {
  it("toda llave foránea tiene un índice cuya primera columna es la FK", async () => {
    const r = await db.query<{ tbl: string; con: string; col: string }>(
      `select c.conrelid::regclass::text as tbl, c.conname as con, a.attname as col
         from pg_constraint c
         join pg_namespace n on n.oid = c.connamespace
         join lateral unnest(c.conkey) with ordinality k(attnum, ord) on true
         join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
        where c.contype = 'f' and n.nspname = 'public' and k.ord = 1
          and not exists (
            select 1 from pg_index i
             where i.indrelid = c.conrelid and i.indisvalid and i.indkey[0] = k.attnum
          )`
    );
    const bad = r.rows.map((x) => `${x.tbl}.${x.col} (${x.con})`).filter((s) => !(s in FK_WITHOUT_INDEX));
    expect(bad).toEqual([]);
  });

  it("existen los índices de consultas frecuentes por despacho + fecha", async () => {
    const r = await db.query<{ def: string }>(`select indexdef as def from pg_indexes where schemaname = 'public'`);
    const defs = r.rows.map((x) => x.def.replace(/\s+/g, " "));
    const has = (table: string, cols: string) => defs.some((d) => d.includes(`ON public.${table} `) && d.includes(`(${cols}`));
    expect(has("appointments", "firm_id, starts_at")).toBe(true);
    expect(has("tasks", "firm_id, due_at")).toBe(true);
    expect(has("time_entries", "firm_id, worked_on")).toBe(true);
    expect(has("invoices", "firm_id, issue_date")).toBe(true);
    expect(has("payments", "firm_id, paid_on")).toBe(true);
    expect(has("case_events", "case_id, happened_at")).toBe(true);
    expect(has("audit_log", "firm_id, at")).toBe(true);
    expect(has("ai_audit_log", "user_id, created_at")).toBe(true);
  });
});
