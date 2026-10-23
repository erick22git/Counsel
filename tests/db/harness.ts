import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS = path.resolve(__dirname, "../../supabase/migrations");

/** Reproduce lo mínimo de Supabase (esquema auth, roles) para probar migraciones y RLS en Postgres WASM. */
export async function createDb() {
  const db = new PGlite({ extensions: { vector } });
  await db.exec(`
    create schema if not exists auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
    end $$;
    grant usage on schema public, auth to authenticated, anon;
  `);
  // Solo migraciones de esquema: las de storage requieren el esquema `storage` de Supabase.
  const files = fs
    .readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql") && !f.includes("storage"))
    .sort();
  for (const f of files) await db.exec(fs.readFileSync(path.join(MIGRATIONS, f), "utf8"));
  await db.exec(`
    grant select, insert, update, delete on all tables in schema public to authenticated;
    grant select on all tables in schema public to anon;
    grant execute on all functions in schema public to authenticated, anon;
  `);
  return db;
}

export async function createUser(db: PGlite, email: string) {
  const r = await db.query<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [email]);
  return r.rows[0].id;
}

/** Ejecuta `fn` con rol authenticated/anon y el uid indicado (como lo hace PostgREST). */
export async function asUser<T>(db: PGlite, uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${uid ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
