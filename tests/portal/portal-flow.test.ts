// (c) Flujo completo del portal: el titular crea cliente, caso, eventos, documentos y cita; el cliente (role='client')
// solo ve lo suyo y lo marcado como visible/compartido.
import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createDb, createUser, asUser } from "../db/harness";

let db: PGlite;
let ana: string, beto: string, clienteUno: string, clienteDos: string, firmA: string;
let caseUno: string;

beforeAll(async () => {
  db = await createDb();
  ana = await createUser(db, "ana@demo.bo");
  beto = await createUser(db, "beto@demo.bo");
  clienteUno = await createUser(db, "uno@demo.bo");
  clienteDos = await createUser(db, "dos@demo.bo");
  firmA = await asUser(db, ana, async () => (await db.query<{ register_firm: string }>(`select register_firm('Despacho Alfa Demo','Ana Demo')`)).rows[0].register_firm);
  await asUser(db, beto, async () => db.query(`select register_firm('Bufete Beta Demo','Beto Demo')`));

  const ids = await asUser(db, ana, async () => {
    const c1 = (await db.query<{ id: string }>(`insert into clients (full_name) values ('Cliente Ficticio Uno') returning id`)).rows[0].id;
    const c2 = (await db.query<{ id: string }>(`insert into clients (full_name) values ('Cliente Ficticio Dos') returning id`)).rows[0].id;
    const k1 = (await db.query<{ id: string }>(`insert into cases (client_id,title) values ($1,'Caso Uno') returning id`, [c1])).rows[0].id;
    const k2 = (await db.query<{ id: string }>(`insert into cases (client_id,title) values ($1,'Caso Dos') returning id`, [c2])).rows[0].id;
    await db.query(`insert into case_events (case_id,title,visible_to_client) values ($1,'Uno visible',true),($1,'Uno interno',false),($2,'Dos visible',true)`, [k1, k2]);
    await db.query(`insert into documents (case_id,title,shared_with_client) values ($1,'Contrato compartido',true),($1,'Borrador interno',false),($2,'Doc de Dos',true)`, [k1, k2]);
    await db.query(`insert into appointments (case_id,title,starts_at,visible_to_client) values ($1,'Audiencia visible','2030-01-01',true),($1,'Reunión interna','2030-01-02',false)`, [k1]);
    return { c1, c2, k1 };
  });
  caseUno = ids.k1;
  // invitación: el servidor (service-role) crea el perfil role='client' vinculado
  await db.query(
    `insert into profiles (id,firm_id,full_name,email,role,client_id) values ($1,$2,'Cliente Uno','uno@demo.bo','client',$3),($4,$2,'Cliente Dos','dos@demo.bo','client',$5)`,
    [clienteUno, firmA, ids.c1, clienteDos, ids.c2]);
});

const q = <T extends object>(uid: string, sql: string) => asUser(db, uid, async () => (await db.query<T>(sql)).rows);

describe("portal del cliente: flujo completo", () => {
  it("el cliente 1 ve solo su caso, sus eventos visibles, sus documentos compartidos y sus citas visibles", async () => {
    expect((await q<{ title: string }>(clienteUno, `select title from cases`)).map((r) => r.title)).toEqual(["Caso Uno"]);
    expect((await q<{ title: string }>(clienteUno, `select title from case_events`)).map((r) => r.title)).toEqual(["Uno visible"]);
    expect((await q<{ title: string }>(clienteUno, `select title from documents`)).map((r) => r.title)).toEqual(["Contrato compartido"]);
    expect((await q<{ title: string }>(clienteUno, `select title from appointments`)).map((r) => r.title)).toEqual(["Audiencia visible"]);
    // 0012: el portal no lee `clients` (tiene notas internas del abogado).
    expect(await q<{ full_name: string }>(clienteUno, `select full_name from clients`)).toEqual([]);
  });

  it("el cliente 2 no ve nada del cliente 1", async () => {
    expect((await q<{ title: string }>(clienteDos, `select title from case_events`)).map((r) => r.title)).toEqual(["Dos visible"]);
    expect((await q<{ title: string }>(clienteDos, `select title from documents`)).map((r) => r.title)).toEqual(["Doc de Dos"]);
    expect(await q(clienteDos, `select 1 from appointments`)).toHaveLength(0);
  });

  it("si el titular oculta el caso o quita lo compartido, el cliente deja de verlo", async () => {
    await asUser(db, ana, async () => {
      await db.query(`update documents set shared_with_client=false where title='Contrato compartido'`);
      await db.query(`update case_events set visible_to_client=false where title='Uno visible'`);
    });
    expect(await q(clienteUno, `select 1 from documents`)).toHaveLength(0);
    expect(await q(clienteUno, `select 1 from case_events`)).toHaveLength(0);
    await asUser(db, ana, async () => { await db.query(`update cases set portal_visible=false where id=$1`, [caseUno]); });
    expect(await q(clienteUno, `select 1 from cases`)).toHaveLength(0);
    await asUser(db, ana, async () => { await db.query(`update cases set portal_visible=true where id=$1`, [caseUno]); });
  });

  it("el cliente no puede escribir ni ver notificaciones, tareas ni datos de otro despacho", async () => {
    await expect(asUser(db, clienteUno, async () => db.query(`insert into case_events (case_id,title,visible_to_client) values ($1,'x',true)`, [caseUno]))).rejects.toThrow();
    expect(await q(clienteUno, `select 1 from notifications`)).toHaveLength(0);
    expect(await q(clienteUno, `select 1 from tasks`)).toHaveLength(0);
    expect(await q(beto, `select 1 from cases`)).toHaveLength(0);
  });
});
