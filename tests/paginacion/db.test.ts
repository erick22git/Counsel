import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import fs from "node:fs";
import path from "node:path";
import { createDb, createUser, asUser } from "../db/harness";
import { docTipo, TIPO_LABEL, type DocTipo } from "@/lib/documentos/files";
import { docTipoSql, escapeIlike, ilikePattern, pageRange } from "@/lib/paginacion";

let db: PGlite;
let ana: string;
const N = 130;

beforeAll(async () => {
  db = await createDb();
  ana = await createUser(db, "ana-pag@demo.bo");
  await asUser(db, ana, async () => db.query(`select register_firm('Despacho Paginación Demo','Ana Demo')`));
  await asUser(db, ana, async () => {
    // 130 clientes ficticios: "Cliente 001" … "Cliente 130"; algunos con caracteres especiales.
    await db.query(
      `insert into clients (full_name, ci_nit)
       select 'Cliente ' || lpad(i::text, 3, '0'), (1000000 + i)::text from generate_series(1, ${N}) i`
    );
    await db.query(
      `insert into clients (full_name) values ('Descuento 50% Ficticio'), ('Ruta_A Demo'), ('Barra ' || chr(92) || ' Demo'), ('Borrado Demo')`
    );
    await db.query(`update clients set deleted_at = now() where full_name = 'Borrado Demo'`);
    const cid = (await db.query<{ id: string }>(`select id from clients where full_name = 'Cliente 001'`)).rows[0].id;
    await db.query(
      `insert into cases (client_id, title, case_number, opponent, matter)
       select $1, 'Caso ' || lpad(i::text, 3, '0'), 'EXP-' || i, case when i % 10 = 0 then 'Parte Contraria Ficticia' end,
              case when i % 2 = 0 then 'civil' else 'penal' end
       from generate_series(1, ${N}) i`,
      [cid]
    );
    await db.query(
      `insert into documents (title, kind, mime) values
        ('Poder notarial', 'escrito', null), ('Contrato (escrito)', 'escrito', 'text/html'),
        ('Demanda', 'archivo', 'application/pdf'), ('Informe', 'archivo', 'application/pdf'),
        ('Memorial', 'archivo', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        ('Notas', 'archivo', 'application/msword'),
        ('Cuentas', 'archivo', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
        ('Presupuesto', 'archivo', 'application/vnd.ms-excel'),
        ('Foto sello', 'archivo', 'image/jpeg'), ('Captura', 'archivo', 'image/png'),
        ('Apuntes', 'archivo', 'text/plain'), ('Sin tipo', 'archivo', null)`
    );
  });
});

const q = async <T extends object = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  asUser(db, ana, async () => (await db.query<T>(sql, params)).rows);

describe("paginación con range (limit/offset) sobre 130+ filas", () => {
  it("las páginas no se solapan y cubren todo, con total exacto", async () => {
    const seen = new Set<string>();
    let total = 0;
    const pages = Math.ceil((N + 3) / 25);
    for (let p = 1; p <= pages; p++) {
      const { from, to } = pageRange(p);
      const rows = await q<{ id: string; full_name: string }>(
        `select id, full_name from clients where deleted_at is null order by full_name, id limit $1 offset $2`,
        [to - from + 1, from]
      );
      for (const r of rows) {
        expect(seen.has(r.id)).toBe(false);
        seen.add(r.id);
      }
      total += rows.length;
    }
    expect(total).toBe(N + 3); // 130 + 3 con caracteres especiales; el borrado queda fuera
    const [{ count }] = await q<{ count: number }>(`select count(*)::int as count from clients where deleted_at is null`);
    expect(count).toBe(N + 3);
  });

  it("una página fuera de rango devuelve vacío", async () => {
    const { from, to } = pageRange(50);
    expect(await q(`select id from clients order by id limit $1 offset $2`, [to - from + 1, from])).toEqual([]);
  });
});

describe("búsqueda ilike con patrones escapados", () => {
  const like = (col: string, table: string, text: string) =>
    q<{ v: string }>(`select ${col} as v from ${table} where ${col} ilike $1 order by 1`, [ilikePattern(text)]);

  it("coincide sin importar mayúsculas y parcialmente", async () => {
    const r = (await like("full_name", "clients", "cliente 12")).map((x) => x.v);
    expect(r).toEqual([
      "Cliente 120", "Cliente 121", "Cliente 122", "Cliente 123", "Cliente 124",
      "Cliente 125", "Cliente 126", "Cliente 127", "Cliente 128", "Cliente 129",
    ]);
  });
  it("busca por CI/NIT y por varias columnas (or)", async () => {
    const r = await q(`select id from clients where full_name ilike $1 or ci_nit ilike $1`, [ilikePattern("1000050")]);
    expect(r).toHaveLength(1);
  });
  it("% se trata como literal", async () => {
    expect((await like("full_name", "clients", "50%")).map((r) => r.v)).toEqual(["Descuento 50% Ficticio"]);
    expect(await like("full_name", "clients", "%")).toHaveLength(1);
  });
  it("_ se trata como literal", async () => {
    expect((await like("full_name", "clients", "Ruta_A")).map((r) => r.v)).toEqual(["Ruta_A Demo"]);
    expect(await like("full_name", "clients", "_")).toHaveLength(1);
  });
  it("\\ se trata como literal", async () => {
    const r = await like("full_name", "clients", "\\");
    expect(r.map((x) => x.v)).toEqual(["Barra \\ Demo"]);
  });
  it("sin escapar, %%% coincidiría con todo (el escape importa)", async () => {
    const all = await q(`select id from clients where full_name ilike $1`, ["%%%"]);
    expect(all.length).toBeGreaterThan(100);
    expect(escapeIlike("%")).toBe("\\%");
  });
  it("casos: título, expediente y parte contraria, con filtro de materia", async () => {
    const r = await q<{ title: string }>(
      `select title from cases where (title ilike $1 or case_number ilike $1 or opponent ilike $1) and matter = $2 order by title`,
      [ilikePattern("contraria"), "civil"]
    );
    expect(r).toHaveLength(13); // múltiplos de 10 hasta 130 (todos pares → civil)
    const exp = await q(`select id from cases where case_number ilike $1`, [ilikePattern("EXP-13")]);
    expect(exp).toHaveLength(2); // EXP-13 y EXP-130
  });
});

describe("filtro por tipo de documento en el servidor = docTipo() en memoria", () => {
  it("cada tipo devuelve exactamente los mismos documentos", async () => {
    const all = await q<{ id: string; kind: "archivo" | "escrito"; mime: string | null }>(`select id, kind, mime from documents`);
    expect(all).toHaveLength(12);
    for (const tipo of Object.keys(TIPO_LABEL) as DocTipo[]) {
      const sql = await q<{ id: string }>(`select id from documents where ${docTipoSql(tipo)} order by id`);
      const mem = all.filter((d) => docTipo(d) === tipo).map((d) => d.id).sort();
      expect(sql.map((r) => r.id).sort()).toEqual(mem);
    }
  });
});

describe("migración 0013_search_indexes con pg_trgm", () => {
  it("no rompe el harness sin pg_trgm (se omite con aviso)", async () => {
    // createDb() ya aplicó la migración sin pg_trgm cargado: si hubiera fallado, beforeAll habría lanzado.
    const idx = await db.query<{ indexname: string }>(`select indexname from pg_indexes where indexname = 'clients_full_name_trgm'`);
    expect(idx.rows).toHaveLength(0);
  });

  it("con pg_trgm disponible crea los índices gin", async () => {
    const d = new PGlite({ extensions: { vector, pg_trgm } });
    const dir = path.resolve(__dirname, "../../supabase/migrations");
    await d.exec(`
      create schema if not exists auth;
      create table auth.users (id uuid primary key default gen_random_uuid(), email text);
      create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      do $$ begin
        if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
        if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
      end $$;
    `);
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql") && !x.includes("storage")).sort()) {
      await d.exec(fs.readFileSync(path.join(dir, f), "utf8"));
    }
    const idx = await d.query<{ indexname: string }>(`select indexname from pg_indexes where indexname like '%_trgm' order by 1`);
    expect(idx.rows.map((r) => r.indexname)).toEqual([
      "cases_case_number_trgm", "cases_opponent_trgm", "cases_title_trgm", "clients_ci_nit_trgm", "clients_full_name_trgm", "documents_title_trgm",
    ]);
    await d.close();
  });
});
