import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createDb } from "../db/harness";
import { extractVariables } from "@/lib/editor/template";

let rows: { slug: string; title: string; category: string; body_html: string; variables: { key: string; label: string; type: string }[] }[];

beforeAll(async () => {
  const db: PGlite = await createDb();
  rows = (await db.query(`select slug, title, category, body_html, variables from templates where firm_id is null`)).rows as typeof rows;
});

describe("plantillas globales (0003)", () => {
  it("hay al menos 30 con slugs únicos", () => {
    expect(rows.length).toBeGreaterThanOrEqual(30);
    expect(new Set(rows.map((r) => r.slug)).size).toBe(rows.length);
  });
  it("cubre las 6 categorías", () => {
    const cats = new Set(rows.map((r) => r.category));
    for (const c of ["Civil", "Familia", "Laboral", "Penal", "Comercial y societario", "General"]) expect(cats.has(c)).toBe(true);
  });
  it("todas las {{variables}} están declaradas y viceversa", () => {
    for (const r of rows) {
      const used = extractVariables(r.body_html).sort();
      const declared = r.variables.map((v) => v.key).sort();
      expect(declared, r.slug).toEqual(used);
      for (const v of r.variables) {
        expect(v.label, `${r.slug}.${v.key}`).toBeTruthy();
        expect(["texto", "fecha", "numero", "largo"]).toContain(v.type);
      }
    }
  });
  it("llevan la nota de modelo referencial", () => {
    for (const r of rows) expect(r.body_html, r.slug).toContain("<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>");
  });
  it("no citan artículos ni leyes concretas", () => {
    for (const r of rows) {
      expect(r.body_html, r.slug).not.toMatch(/art[ií]culo\s*\d|\bart\.\s*\d|\bley\s*(n[º°.]|nro|\d)|decreto\s+(supremo|ley)/i);
    }
  });
});
