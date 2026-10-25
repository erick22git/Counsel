import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createDb } from "./harness";
import { runCheck, literalKeys, selectColumns, extractUsages, checkUsages, loadSchema } from "../../scripts/check-schema";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let db: PGlite;
beforeAll(async () => {
  db = await createDb();
});

describe("parser del verificador", () => {
  it("extrae claves de literales", () => {
    expect(literalKeys(`{ a: 1, "b": x, c, d: { e: 2 }, f: fn(1, 2) }`)).toEqual({ keys: ["a", "b", "c", "d", "f"], dynamic: false });
    expect(literalKeys(`[{ a: 1 }, { b: 2, ...rest }]`)).toEqual({ keys: ["a", "b"], dynamic: true });
    expect(literalKeys(`row`).dynamic).toBe(true);
  });
  it("extrae columnas de select", () => {
    expect(selectColumns("id, full_name, cases(id, title), alias:ci_nit, *")).toEqual(["id", "full_name", "ci_nit"]);
  });
  it("detecta tablas y columnas inexistentes", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chk-"));
    const f = path.join(dir, "x.ts");
    fs.writeFileSync(f, `sb.from("clients").select("id, nombre_falso").eq("tampoco", 1).update({ full_name: "a", inventada: 1 });
      sb.from("tabla_fantasma").select("*"); sb.rpc("fn_fantasma", { p: 1 }); sb.rpc("submit_intake", { p_slug: "a", p_mal: 1 });`);
    const { usages } = extractUsages([f], dir);
    const msgs = checkUsages(usages, await loadSchema(db)).map((x) => x.message).join("\n");
    expect(msgs).toContain('"clients.nombre_falso"');
    expect(msgs).toContain('"clients.tampoco"');
    expect(msgs).toContain('"clients.inventada"');
    expect(msgs).not.toContain("clients.full_name");
    expect(msgs).toContain('"tabla_fantasma"');
    expect(msgs).toContain('"fn_fantasma"');
    expect(msgs).toContain('"p_mal"');
    fs.rmSync(dir, { recursive: true });
  });
});

describe("el código coincide con el esquema", () => {
  it("todas las tablas, columnas y RPC usados por src/** y scripts/** existen", async () => {
    const r = await runCheck(db);
    expect(r.usages.length).toBeGreaterThan(100); // sanity: el extractor encuentra usos
    const msg = r.findings.map((f) => `${f.usage.file}:${f.usage.line} ${f.message}`);
    expect(msg).toEqual([]);
  });

  it("appointments existe con todas las columnas que usa el código (incluida reminded_at)", async () => {
    const r = await runCheck(db);
    const cols = r.schema.tables.get("appointments");
    expect(cols).toBeDefined();
    expect(cols!.has("reminded_at")).toBe(true);
    const used = new Set(r.usages.filter((u) => u.kind === "column" && u.table === "appointments").map((u) => u.name));
    expect(used.has("reminded_at")).toBe(true);
    for (const c of used) expect(cols!.has(c), `appointments.${c}`).toBe(true);
  });
});
