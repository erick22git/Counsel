import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createDb, createUser, asUser } from "./harness";

/**
 * Auditoría de seguridad de la base. Usa `realGrants: true`: imita los privilegios por defecto de Supabase
 * (anon/authenticated con ALL sobre tablas y EXECUTE sobre funciones; PUBLIC con EXECUTE), sin los grants
 * "de conveniencia" del harness normal, para que se vea lo que de verdad queda expuesto.
 */

/** Tablas de `public` sin RLS/política. Debe quedar vacía; cada excepción exige justificación escrita. */
const RLS_EXCEPTIONS: Record<string, string> = {};

/** Tablas de negocio (todo lo que no es catálogo global): anon nunca debe leerlas. */
const GLOBAL_CATALOGS = new Set(["law_sources", "law_chunks", "templates"]);

/** Únicas funciones ejecutables por anon. */
const PUBLIC_RPC = ["firm_public", "request_appointment", "submit_intake"];

let db: PGlite;
let ana: string, beto: string, cliente: string, firmA: string, clientA: string;

beforeAll(async () => {
  db = await createDb({ realGrants: true });
  ana = await createUser(db, "ana@demo.bo");
  beto = await createUser(db, "beto@demo.bo");
  cliente = await createUser(db, "cliente@demo.bo");
  firmA = await asUser(db, ana, async () => (await db.query<{ r: string }>(`select register_firm('Despacho Alfa Demo','Ana Demo') r`)).rows[0].r);
  await asUser(db, beto, async () => db.query(`select register_firm('Bufete Beta Demo','Beto Demo')`));
  clientA = await asUser(db, ana, async () => (await db.query<{ id: string }>(`insert into clients (full_name, notes) values ('Cliente Ficticio Uno','nota interna') returning id`)).rows[0].id);
  await asUser(db, ana, async () => db.query(`insert into cases (client_id, title) values ($1,'Caso Demo A')`, [clientA]));
  await db.query(`insert into profiles (id, firm_id, full_name, role, client_id) values ($1,$2,'Cliente Portal','client',$3)`, [cliente, firmA, clientA]);
  await asUser(db, ana, async () => db.query(`insert into templates (title, category, body_html) values ('Plantilla privada','civil','<p>x</p>')`));
  await db.query(`insert into templates (slug, title, category, body_html) values ('global-x','Global','civil','<p>g</p>') on conflict do nothing`);
  const s = await db.query<{ id: string }>(`insert into law_sources (code,title,is_demo) values ('DEMO-RLS','Norma ficticia',true) returning id`);
  await db.query(`insert into law_chunks (source_id, article, content) values ($1,'Artículo 1','texto ficticio')`, [s.rows[0].id]);
});

const publicTables = async () =>
  (await db.query<{ tablename: string; rowsecurity: boolean }>(
    `select c.relname as tablename, c.relrowsecurity as rowsecurity
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r','p') order by 1`
  )).rows;

describe("cobertura de RLS", () => {
  it("toda tabla de public tiene RLS activa y al menos una política", async () => {
    const tables = await publicTables();
    expect(tables.length).toBeGreaterThan(20);
    const policies = await db.query<{ tablename: string }>(`select distinct tablename from pg_policies where schemaname = 'public'`);
    const withPolicy = new Set(policies.rows.map((r) => r.tablename));
    const bad = tables
      .filter((t) => !(t.tablename in RLS_EXCEPTIONS))
      .filter((t) => !t.rowsecurity || !withPolicy.has(t.tablename))
      .map((t) => `${t.tablename} (rls=${t.rowsecurity}, políticas=${withPolicy.has(t.tablename)})`);
    expect(bad).toEqual([]);
  });

  it("las excepciones declaradas existen y tienen justificación", () => {
    for (const [t, why] of Object.entries(RLS_EXCEPTIONS)) expect(why.length, t).toBeGreaterThan(10);
  });

  it("ninguna política permite a anon (ni a PUBLIC) leer tablas", async () => {
    const r = await db.query<{ tablename: string; policyname: string; roles: string[]; cmd: string }>(
      `select tablename, policyname, roles::text[] as roles, cmd from pg_policies where schemaname = 'public'`
    );
    const bad = r.rows.filter((p) => p.roles.some((x) => x === "anon" || x === "public") && ["SELECT", "ALL"].includes(p.cmd));
    expect(bad).toEqual([]);
  });

  it("anon no tiene privilegios de tabla ni de secuencia en public", async () => {
    const t = await db.query<{ t: string; priv: string }>(
      `select c.relname t, p.priv from pg_class c join pg_namespace n on n.oid=c.relnamespace,
         unnest(array['select','insert','update','delete','truncate','references','trigger']) p(priv)
       where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('anon', c.oid, p.priv)`
    );
    expect(t.rows).toEqual([]);
  });

  it("anon recibe 0 filas o 'permiso denegado' en cualquier tabla de negocio", async () => {
    for (const t of await publicTables()) {
      const res = await asUser(db, null, async () => {
        try {
          return (await db.query(`select * from public."${t.tablename}"`)).rows.length;
        } catch {
          return 0;
        }
      });
      expect(res, t.tablename).toBe(0);
    }
  });
});

describe("catálogos globales (leyes y plantillas)", () => {
  it("el catálogo conocido sigue siendo exactamente law_sources/law_chunks/templates", async () => {
    const names = new Set((await publicTables()).map((t) => t.tablename));
    for (const g of GLOBAL_CATALOGS) expect(names.has(g), g).toBe(true);
  });

  it("authenticated no puede escribir law_sources ni law_chunks", async () => {
    for (const sql of [
      `insert into law_sources (code,title) values ('X','x')`,
      `insert into law_chunks (source_id, content) select id,'x' from law_sources limit 1`,
    ]) {
      await expect(asUser(db, ana, async () => db.query(sql)), sql).rejects.toThrow();
    }
    for (const sql of [`update law_sources set title='hack'`, `delete from law_sources`, `update law_chunks set content='hack'`, `delete from law_chunks`]) {
      const r = await asUser(db, ana, async () => db.query(sql));
      expect(r.affectedRows, sql).toBe(0);
    }
    expect(Number((await db.query<{ n: number }>(`select count(*)::int n from law_chunks`)).rows[0].n)).toBeGreaterThan(0);
  });

  it("las plantillas globales (firm_id nulo) no se crean, editan ni borran desde la app", async () => {
    await expect(asUser(db, ana, async () => db.query(`insert into templates (firm_id, title, category, body_html) values (null,'G','x','<p/>')`))).rejects.toThrow();
    const u = await asUser(db, ana, async () => db.query(`update templates set title='hack' where firm_id is null`));
    expect(u.affectedRows).toBe(0);
    const d = await asUser(db, ana, async () => db.query(`delete from templates where firm_id is null`));
    expect(d.affectedRows).toBe(0);
    // y no se puede "mover" una propia a global
    await expect(asUser(db, ana, async () => db.query(`update templates set firm_id = null where firm_id is not null`))).rejects.toThrow();
  });

  it("las plantillas propias son privadas del despacho (otro despacho no las ve)", async () => {
    const a = await asUser(db, ana, async () => (await db.query<{ title: string }>(`select title from templates order by title`)).rows.map((r) => r.title));
    const b = await asUser(db, beto, async () => (await db.query<{ title: string }>(`select title from templates order by title`)).rows.map((r) => r.title));
    expect(a).toContain("Plantilla privada");
    expect(a).toContain("Global");
    expect(b).not.toContain("Plantilla privada");
    expect(b).toContain("Global");
  });

  it("el cliente del portal NO lee plantillas (privadas del despacho) pero sí las leyes", async () => {
    const t = await asUser(db, cliente, async () => (await db.query(`select * from templates`)).rows);
    expect(t).toHaveLength(0);
    const l = await asUser(db, cliente, async () => (await db.query(`select * from law_sources`)).rows);
    expect(l.length).toBeGreaterThan(0);
  });
});

describe("funciones (RPC)", () => {
  const fns = async () =>
    (await db.query<{ name: string; sig: string; anon: boolean; pub: boolean; definer: boolean; config: string[] | null; ext: boolean }>(
      `select p.proname as name, p.oid::regprocedure::text as sig,
              has_function_privilege('anon', p.oid, 'execute') as anon,
              coalesce((select bool_or(a.grantee = 0) from aclexplode(p.proacl) a where a.privilege_type='EXECUTE'), p.proacl is null) as pub,
              p.prosecdef as definer, p.proconfig as config,
              exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') as ext
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' order by 1`
    )).rows;

  it("submit_intake, request_appointment y firm_public son las ÚNICAS funciones con acceso de anon", async () => {
    const exposed = (await fns()).filter((f) => !f.ext && f.anon).map((f) => f.name);
    expect([...new Set(exposed)].sort()).toEqual(PUBLIC_RPC);
  });

  it("ninguna función propia queda ejecutable por PUBLIC salvo las 3 públicas", async () => {
    const exposed = (await fns()).filter((f) => !f.ext && f.pub && !PUBLIC_RPC.includes(f.name)).map((f) => f.sig);
    expect(exposed).toEqual([]);
  });

  it("toda función security definer tiene search_path fijo (sin pg_temp antes de public)", async () => {
    const bad = (await fns())
      .filter((f) => f.definer)
      .filter((f) => !(f.config ?? []).some((c) => /^search_path=/.test(c)))
      .map((f) => f.sig);
    expect(bad).toEqual([]);
    const sd = (await fns()).filter((f) => f.definer);
    expect(sd.length).toBeGreaterThan(5);
  });

  it("anon puede llamar a los RPC públicos y no a register_firm / set_member_role / team_directory", async () => {
    const slug = (await db.query<{ slug: string }>(`select slug from firms where name='Despacho Alfa Demo'`)).rows[0].slug;
    const ok = await asUser(db, null, async () => (await db.query<{ name: string }>(`select * from firm_public($1)`, [slug])).rows);
    expect(ok[0].name).toBe("Despacho Alfa Demo");
    for (const sql of [`select register_firm('X Despacho','Nombre')`, `select team_directory()`, `select set_member_role(gen_random_uuid(),'lawyer')`, `select current_firm_id()`, `select has_role('owner')`]) {
      await expect(asUser(db, null, async () => db.query(sql)), sql).rejects.toThrow(/permission denied|permiso denegado/i);
    }
  });
});

describe("abusos de los RPC públicos", () => {
  const slug = "despacho-alfa-demo";

  it("register_firm: exige sesión, valida largos y no permite un segundo despacho", async () => {
    const u = await createUser(db, "nuevo@demo.bo");
    await expect(asUser(db, null, async () => db.query(`select register_firm('Algo Legal','Nombre')`))).rejects.toThrow();
    await expect(asUser(db, u, async () => db.query(`select register_firm('A','Nombre')`))).rejects.toThrow(/despacho/i);
    await expect(asUser(db, u, async () => db.query(`select register_firm('Bufete Valido', $1)`, ["x".repeat(500)]))).rejects.toThrow(/nombre/i);
    await expect(asUser(db, u, async () => db.query(`select register_firm('Bufete Valido', '  ')`))).rejects.toThrow(/nombre/i);
    await asUser(db, u, async () => db.query(`select register_firm('Bufete Valido','Persona Demo')`));
    await expect(asUser(db, u, async () => db.query(`select register_firm('Otro Bufete','Persona Demo')`))).rejects.toThrow(/Ya tienes/);
  });

  it("register_firm: dos despachos con el mismo nombre obtienen slugs distintos (sin colisión ni toma del ajeno)", async () => {
    const u1 = await createUser(db, "dup1@demo.bo");
    const u2 = await createUser(db, "dup2@demo.bo");
    await asUser(db, u1, async () => db.query(`select register_firm('Mismo Nombre Legal','Uno Demo')`));
    await asUser(db, u2, async () => db.query(`select register_firm('Mismo Nombre Legal','Dos Demo')`));
    const s = (await db.query<{ slug: string }>(`select slug from firms where name='Mismo Nombre Legal'`)).rows.map((r) => r.slug);
    expect(new Set(s).size).toBe(2);
    for (const x of s) expect(x).toMatch(/^[a-z0-9-]{3,40}$/);
  });

  it("submit_intake: limita largos y correo inválido", async () => {
    const call = (email: string, phone = "", matter = "civil", name = "Persona Ficticia") =>
      asUser(db, null, async () => db.query(`select submit_intake($1,$2,$3,$4,$5,'Necesito asesoría por un contrato')`, [slug, name, email, phone, matter]));
    await expect(call("a".repeat(300) + "@x.bo")).rejects.toThrow(/largo/);
    await expect(call("", "1".repeat(100))).rejects.toThrow(/largo/);
    await expect(call("sin-arroba")).rejects.toThrow(/Correo/);
    await expect(call("", "", "m".repeat(100))).rejects.toThrow(/largo/);
    await expect(call("", "", "civil", "N".repeat(300))).rejects.toThrow(/largo/);
  });

  it("submit_intake / request_appointment: freno por despacho contra inundación", async () => {
    const calls = async (fn: () => Promise<unknown>, n: number) => {
      let ok = 0;
      for (let i = 0; i < n; i++) {
        try { await fn(); ok++; } catch { /* límite */ }
      }
      return ok;
    };
    const intake = await calls(
      () => asUser(db, null, async () => db.query(`select submit_intake($1,'Spam Ficticio','','','','Mensaje repetido de prueba')`, [slug])),
      40
    );
    expect(intake).toBeLessThanOrEqual(30);
    expect(intake).toBeGreaterThan(5);
    const appt = await calls(
      () => asUser(db, null, async () => db.query(`select request_appointment($1,'Spam Ficticio','','','motivo', now() + interval '3 days')`, [slug])),
      30
    );
    expect(appt).toBeLessThanOrEqual(20);
    expect(appt).toBeGreaterThan(5);
    await expect(
      asUser(db, null, async () => db.query(`select request_appointment('despacho-alfa-demo','Ana','','','x', now() + interval '5 years')`))
    ).rejects.toThrow();
  });
});

describe("perfiles", () => {
  it("un usuario no puede escalar su propio rol", async () => {
    await expect(asUser(db, ana, async () => db.query(`update profiles set role = 'owner' where id = $1`, [cliente]))).resolves.toBeDefined();
    const r = (await db.query<{ role: string }>(`select role from profiles where id = $1`, [cliente])).rows[0].role;
    expect(r).toBe("client");
    await expect(asUser(db, cliente, async () => db.query(`update profiles set role = 'owner' where id = $1`, [cliente]))).rejects.toThrow();
  });
});

