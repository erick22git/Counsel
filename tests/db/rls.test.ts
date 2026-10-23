import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createDb, createUser, asUser } from "./harness";

let db: PGlite;
let ana: string, beto: string, cliente: string;
let firmA: string, caseA: string, clientA: string;

beforeAll(async () => {
  db = await createDb();
  ana = await createUser(db, "ana@demo.bo");
  beto = await createUser(db, "beto@demo.bo");
  cliente = await createUser(db, "cliente@demo.bo");

  firmA = await asUser(db, ana, async () => (await db.query<{ register_firm: string }>(`select register_firm('Despacho Alfa Demo','Ana Demo')`)).rows[0].register_firm);
  await asUser(db, beto, async () => db.query(`select register_firm('Bufete Beta Demo','Beto Demo')`));

  clientA = await asUser(db, ana, async () => (await db.query<{ id: string }>(`insert into clients (full_name) values ('Cliente Ficticio Uno') returning id`)).rows[0].id);
  caseA = await asUser(db, ana, async () => (await db.query<{ id: string }>(`insert into cases (client_id, title) values ($1, 'Caso Demo A') returning id`, [clientA])).rows[0].id);
  await asUser(db, ana, async () => {
    await db.query(`insert into case_events (case_id, title, visible_to_client) values ($1,'Visible',true),($1,'Interno',false)`, [caseA]);
  });
  // vincular usuario-cliente al portal (lo hace el servidor con permisos elevados)
  await db.query(`insert into profiles (id, firm_id, full_name, role, client_id) values ($1,$2,'Cliente Portal','client',$3)`, [cliente, firmA, clientA]);
});

describe("aislamiento multi-tenant (RLS)", () => {
  it("cada despacho ve solo sus clientes y casos", async () => {
    const a = await asUser(db, ana, async () => (await db.query(`select * from cases`)).rows);
    const b = await asUser(db, beto, async () => (await db.query(`select * from cases`)).rows);
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(0);
    const bc = await asUser(db, beto, async () => (await db.query(`select * from clients`)).rows);
    expect(bc).toHaveLength(0);
  });

  it("no se puede insertar en otro despacho", async () => {
    await expect(
      asUser(db, beto, async () => db.query(`insert into clients (firm_id, full_name) values ($1,'Intruso')`, [firmA]))
    ).rejects.toThrow();
  });

  it("no se puede cambiar el despacho ni el rol del propio perfil", async () => {
    await expect(asUser(db, beto, async () => db.query(`update profiles set firm_id = $1`, [firmA]))).rejects.toThrow();
    await expect(asUser(db, beto, async () => db.query(`update profiles set role = 'client'`))).rejects.toThrow();
  });

  it("otro despacho no puede modificar casos ajenos", async () => {
    const r = await asUser(db, beto, async () => db.query(`update cases set title = 'hack' where id = $1`, [caseA]));
    expect(r.affectedRows).toBe(0);
  });

  it("anon no ve nada de negocio", async () => {
    const rows = await asUser(db, null, async () => (await db.query(`select * from cases`)).rows);
    expect(rows).toHaveLength(0);
    const c = await asUser(db, null, async () => (await db.query(`select * from clients`)).rows);
    expect(c).toHaveLength(0);
  });
});

describe("portal del cliente", () => {
  it("ve solo su caso y solo eventos visibles", async () => {
    const cases = await asUser(db, cliente, async () => (await db.query(`select id from cases`)).rows);
    expect(cases).toHaveLength(1);
    const ev = await asUser(db, cliente, async () => (await db.query<{ title: string }>(`select title from case_events`)).rows);
    expect(ev.map((e) => e.title)).toEqual(["Visible"]);
  });

  it("no puede escribir", async () => {
    await expect(asUser(db, cliente, async () => db.query(`insert into clients (full_name) values ('x')`))).rejects.toThrow();
    const r = await asUser(db, cliente, async () => db.query(`update cases set title='x'`));
    expect(r.affectedRows).toBe(0);
  });

  it("ve ítems de sus facturas enviadas pero no borradores ni las de otros", async () => {
    const inv = await asUser(db, ana, async () => {
      const a = (await db.query<{ id: string }>(`insert into invoices (client_id, number, status) values ($1,'F-0001','enviada') returning id`, [clientA])).rows[0].id;
      const b = (await db.query<{ id: string }>(`insert into invoices (client_id, number, status) values ($1,'F-0002','borrador') returning id`, [clientA])).rows[0].id;
      await db.query(`insert into invoice_items (invoice_id, description, unit_price) values ($1,'Honorarios',100),($2,'Borrador',50)`, [a, b]);
      return a;
    });
    const invs = await asUser(db, cliente, async () => (await db.query<{ number: string }>(`select number from invoices`)).rows);
    expect(invs.map((i) => i.number)).toEqual(["F-0001"]);
    const items = await asUser(db, cliente, async () => (await db.query<{ description: string }>(`select description from invoice_items`)).rows);
    expect(items.map((i) => i.description)).toEqual(["Honorarios"]);
    expect(inv).toBeTruthy();
    const other = await asUser(db, beto, async () => (await db.query(`select * from invoice_items`)).rows);
    expect(other).toHaveLength(0);
  });

  it("no ve tareas", async () => {
    const t = await asUser(db, cliente, async () => (await db.query(`select * from tasks`)).rows);
    expect(t).toHaveLength(0);
  });
});

describe("formularios públicos", () => {
  it("anon puede enviar intake vía RPC y solo el despacho dueño lo ve", async () => {
    const id = await asUser(db, null, async () =>
      (await db.query<{ submit_intake: string }>(
        `select submit_intake('despacho-alfa-demo','Persona Ficticia','p@demo.bo','70000000','civil','Necesito asesoría por un contrato')`
      )).rows[0].submit_intake
    );
    expect(id).toBeTruthy();
    const seen = await asUser(db, ana, async () => (await db.query(`select * from intake_submissions`)).rows);
    expect(seen).toHaveLength(1);
    const other = await asUser(db, beto, async () => (await db.query(`select * from intake_submissions`)).rows);
    expect(other).toHaveLength(0);
  });

  it("rechaza datos inválidos y slug inexistente", async () => {
    await expect(asUser(db, null, async () => db.query(`select submit_intake('no-existe','Ana','','','','mensaje largo ok')`))).rejects.toThrow();
    await expect(asUser(db, null, async () => db.query(`select submit_intake('despacho-alfa-demo','A','','','','x')`))).rejects.toThrow();
  });
});

describe("leyes (RAG)", () => {
  it("búsqueda de texto completo en español", async () => {
    const s = await db.query<{ id: string }>(`insert into law_sources (code,title,is_demo) values ('DEMO-1','Norma de prueba ficticia',true) returning id`);
    await db.query(`insert into law_chunks (source_id, article, content) values ($1,'Artículo 1','El arrendamiento es el contrato por el cual una parte cede el uso de una cosa')`, [s.rows[0].id]);
    const r = await asUser(db, ana, async () => (await db.query<{ code: string }>(`select * from search_laws('arrendamiento contrato')`)).rows);
    expect(r.map((x) => x.code)).toContain("DEMO-1");
  });
});
