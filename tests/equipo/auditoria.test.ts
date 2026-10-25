import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createDb, createUser, asUser } from "../db/harness";

let db: PGlite;
let owner: string, lawyer: string, assistant: string, ownerB: string;
let firmA: string, clientA: string, caseA: string;

const q = <T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []) =>
  asUser(db, uid, async () => (await db.query<T>(sql, params)).rows);
const run = (uid: string | null, sql: string, params: unknown[] = []) => asUser(db, uid, async () => db.query(sql, params));
type Log = { action: string; entity: string; summary: string; user_id: string | null; meta: { actor?: string; changes?: Record<string, { from: string | null; to: string | null }> } };
const logs = async (where = "true") => (await db.query<Log>(`select action, entity, summary, user_id, meta from audit_log where ${where} order by at, id`)).rows;

beforeAll(async () => {
  db = await createDb();
  owner = await createUser(db, "titular@demo.bo");
  lawyer = await createUser(db, "abogado@demo.bo");
  assistant = await createUser(db, "asistente@demo.bo");
  ownerB = await createUser(db, "titular-b@demo.bo");
  firmA = (await q<{ register_firm: string }>(owner, `select register_firm('Despacho Alfa Demo','Elena Titular')`))[0].register_firm;
  await q(ownerB, `select register_firm('Bufete Beta Demo','Beto Titular')`);
  await db.query(
    `insert into profiles (id, firm_id, full_name, role) values ($1,$3,'Luis Abogado','lawyer'),($2,$3,'Asia Asistente','assistant')`,
    [lawyer, assistant, firmA]
  );
  clientA = (await q<{ id: string }>(owner, `insert into clients (full_name) values ('Cliente Ficticio A') returning id`))[0].id;
  caseA = (await q<{ id: string }>(lawyer, `insert into cases (client_id,title) values ($1,'Caso Demo') returning id`, [clientA]))[0].id;
});

describe("triggers de auditoría", () => {
  it("registra la creación con quién y qué", async () => {
    const [l] = await logs(`entity='cases' and action='create'`);
    expect(l.summary).toBe("Caso Demo");
    expect(l.user_id).toBe(lawyer);
    expect(l.meta.actor).toBe("Luis Abogado");
  });

  it("en updates guarda solo los campos que cambiaron", async () => {
    await run(lawyer, `update cases set stage='en_tramite' where id=$1`, [caseA]);
    const rows = await logs(`entity='cases' and action='update'`);
    expect(rows).toHaveLength(1);
    expect(rows[0].meta.changes).toEqual({ stage: { from: "nuevo", to: "en_tramite" } });
  });

  it("no registra updates sin cambios reales (solo updated_at)", async () => {
    const before = (await logs()).length;
    await run(lawyer, `update cases set stage='en_tramite' where id=$1`, [caseA]);
    expect((await logs()).length).toBe(before);
  });

  it("archivar queda registrado como cambio de deleted_at", async () => {
    await run(lawyer, `update cases set deleted_at=now() where id=$1`, [caseA]);
    const rows = await logs(`entity='cases' and action='update'`);
    expect(Object.keys(rows[rows.length - 1].meta.changes!)).toEqual(["deleted_at"]);
    await run(lawyer, `update cases set deleted_at=null where id=$1`, [caseA]);
  });

  it("documentos: nunca guarda content_html y recorta textos largos", async () => {
    const id = (await q<{ id: string }>(lawyer, `insert into documents (title, kind, content_html) values ('Escrito demo','escrito','<p>secreto</p>') returning id`))[0].id;
    await run(lawyer, `update documents set content_html='<p>otro secreto</p>', title=$2 where id=$1`, [id, "T".repeat(500)]);
    const rows = await logs(`entity='documents'`);
    const json = JSON.stringify(rows);
    expect(json).not.toContain("secreto");
    const upd = rows.find((r) => r.action === "update")!;
    expect(upd.meta.changes!.title.to!.length).toBe(200);
    expect(upd.meta.changes!.content_html).toBeUndefined();
    // una edición que solo cambia content_html no genera fila
    const n = rows.length;
    await run(lawyer, `update documents set content_html='<p>x</p>' where id=$1`, [id]);
    expect((await logs(`entity='documents'`)).length).toBe(n);
  });

  it("versiones, facturas y pagos se registran", async () => {
    const doc = (await q<{ id: string }>(lawyer, `insert into documents (title) values ('D2') returning id`))[0].id;
    await run(lawyer, `insert into document_versions (document_id, version, content_html) values ($1,2,'<p>x</p>')`, [doc]);
    const inv = (await q<{ id: string }>(lawyer, `insert into invoices (client_id,number) values ($1,'F-9') returning id`, [clientA]))[0].id;
    await run(lawyer, `update invoices set status='enviada' where id=$1`, [inv]);
    await run(lawyer, `insert into payments (invoice_id, amount) values ($1, 25)`, [inv]);
    expect((await logs(`entity='document_versions'`))[0].summary).toBe("Versión 2");
    const invUpd = (await logs(`entity='invoices' and action='update'`))[0];
    expect(invUpd.meta.changes).toEqual({ status: { from: "borrador", to: "enviada" } });
    expect((await logs(`entity='payments'`))[0].summary).toBe("Pago de 25.00");
  });

  it("clientes y borrado definitivo se registran", async () => {
    const c = (await q<{ id: string }>(owner, `insert into clients (full_name) values ('Temporal') returning id`))[0].id;
    await run(owner, `delete from clients where id=$1`, [c]);
    const rows = await logs(`entity='clients' and summary='Temporal'`);
    expect(rows.map((r) => r.action)).toEqual(["create", "delete"]);
  });

  it("cambios de equipo (rol / quitar) quedan registrados", async () => {
    await run(owner, `select set_member_role($1,'lawyer')`, [assistant]);
    await run(owner, `select set_member_active($1,false)`, [assistant]);
    const rows = await logs(`entity='profiles' and action='update'`);
    expect(rows.map((r) => Object.keys(r.meta.changes!).sort())).toEqual([["role"], ["active"]]);
    await run(owner, `select set_member_active($1,true)`, [assistant]);
    await run(owner, `select set_member_role($1,'assistant')`, [assistant]);
  });

  it("eliminar un despacho en cascada no falla por el registro", async () => {
    const x = await createUser(db, "x@demo.bo");
    const firmX = (await q<{ register_firm: string }>(x, `select register_firm('Despacho Temporal','Xavier Demo')`))[0].register_firm;
    await q(x, `insert into clients (full_name) values ('C temporal')`);
    await db.query(`delete from firms where id=$1`, [firmX]);
    expect((await db.query(`select 1 from audit_log where firm_id=$1`, [firmX])).rows).toHaveLength(0);
  });
});

describe("acceso al registro", () => {
  it("solo el titular lee", async () => {
    expect((await q(owner, `select id from audit_log`)).length).toBeGreaterThan(0);
    expect(await q(lawyer, `select id from audit_log`)).toHaveLength(0);
    expect(await q(assistant, `select id from audit_log`)).toHaveLength(0);
    expect(await q(null, `select id from audit_log`)).toHaveLength(0);
  });

  it("nadie edita ni borra, ni siquiera el titular", async () => {
    for (const u of [owner, lawyer, assistant]) {
      expect((await run(u, `update audit_log set summary='x'`)).affectedRows).toBe(0);
      expect((await run(u, `delete from audit_log`)).affectedRows).toBe(0);
    }
    expect((await q<{ n: number }>(owner, `select count(*)::int n from audit_log where summary='x'`))[0].n).toBe(0);
  });

  it("aislamiento: el titular B no ve el registro del A", async () => {
    const rows = await q<{ firm_id: string }>(ownerB, `select firm_id from audit_log`);
    expect(rows.every((r) => r.firm_id !== firmA)).toBe(true);
  });

  it("no se puede insertar un registro falso (solo 'view' propio del despacho)", async () => {
    await expect(run(lawyer, `insert into audit_log (action, entity, summary) values ('delete','cases','falso')`)).rejects.toThrow();
    await expect(run(lawyer, `insert into audit_log (action, entity, summary, user_id) values ('view','cases','x',$1)`, [owner])).rejects.toThrow();
    await expect(
      run(ownerB, `insert into audit_log (firm_id, action, entity, summary, user_id) values ($1,'view','cases','x',$2)`, [firmA, ownerB])
    ).rejects.toThrow();
  });

  it("quién VIO: el personal registra su vista y el titular la lee", async () => {
    await run(assistant, `insert into audit_log (action, entity, entity_id, summary, user_id, meta) values ('view','cases',$1,'Caso Demo',$2,'{"actor":"Asia Asistente"}')`, [caseA, assistant]);
    const rows = await q<{ user_id: string }>(owner, `select user_id from audit_log where action='view'`);
    expect(rows).toEqual([{ user_id: assistant }]);
  });
});
