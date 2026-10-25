import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import fs from "node:fs";
import path from "node:path";
import { buildAllMigrations } from "../../scripts/build-all-migrations.mjs";
import { createDb } from "./harness";

const DIR = path.resolve(__dirname, "../../supabase/migrations");
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

describe("migraciones", () => {
  it("la numeración es contigua (0001, 0002, …) y sin duplicados", () => {
    files.forEach((f, i) => expect(f.slice(0, 4), f).toBe(String(i + 1).padStart(4, "0")));
  });

  it("se aplican limpias y en orden sobre una base vacía (incluida storage con stubs de Supabase)", async () => {
    const db = new PGlite({ extensions: { vector } });
    await db.exec(`
      create schema auth; create table auth.users (id uuid primary key default gen_random_uuid(), email text);
      create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create role authenticated; create role anon;
      grant usage on schema public, auth to authenticated, anon;
      create schema storage;
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
      create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
    `);
    for (const f of files) {
      await expect(db.exec(fs.readFileSync(path.join(DIR, f), "utf8")), f).resolves.toBeDefined();
    }
    const t = await db.query<{ n: number }>(`select count(*)::int n from information_schema.tables where table_schema='public'`);
    expect(t.rows[0].n).toBeGreaterThan(20);
    await db.close();
  });

  it("el esquema resultante no depende de datos previos (createDb dos veces da lo mismo)", async () => {
    const a = await createDb();
    const q = `select table_name||'.'||column_name c from information_schema.columns where table_schema='public' order by 1`;
    const b = await createDb();
    expect((await a.query(q)).rows).toEqual((await b.query(q)).rows);
  });
});

describe("supabase/all-migrations.sql", () => {
  it("coincide con la concatenación actual de supabase/migrations (regenerar: node scripts/build-all-migrations.mjs)", () => {
    const actual = fs.readFileSync(path.resolve(__dirname, "../../supabase/all-migrations.sql"), "utf8").replace(/\r\n/g, "\n");
    expect(actual).toBe(buildAllMigrations());
  });
});
