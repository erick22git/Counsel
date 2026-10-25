import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createDb, createUser, asUser } from "../db/harness";

let db: PGlite;
let owner: string, lawyer: string, assistant: string, inactive: string, ownerB: string, portal: string;
let firmA: string, firmB: string, clientA: string, caseA: string, docA: string, invA: string, clientB: string, caseB: string;

const q = <T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []) =>
  asUser(db, uid, async () => (await db.query<T>(sql, params)).rows);
const run = (uid: string | null, sql: string, params: unknown[] = []) => asUser(db, uid, async () => db.query(sql, params));
const count = async (uid: string | null, table: string) => (await q<{ n: number }>(uid, `select count(*)::int n from ${table}`))[0].n;

beforeAll(async () => {
  db = await createDb();
  owner = await createUser(db, "titular@demo.bo");
  lawyer = await createUser(db, "abogado@demo.bo");
  assistant = await createUser(db, "asistente@demo.bo");
  inactive = await createUser(db, "quitado@demo.bo");
  ownerB = await createUser(db, "titular-b@demo.bo");
  portal = await createUser(db, "cliente@demo.bo");

  firmA = (await q<{ register_firm: string }>(owner, `select register_firm('Despacho Alfa Demo','Elena Titular')`))[0].register_firm;
  firmB = (await q<{ register_firm: string }>(ownerB, `select register_firm('Bufete Beta Demo','Beto Titular')`))[0].register_firm;
  await db.query(
    `insert into profiles (id, firm_id, full_name, email, role) values
     ($1,$4,'Luis Abogado','abogado@demo.bo','lawyer'),
     ($2,$4,'Asia Asistente','asistente@demo.bo','assistant'),
     ($3,$4,'Quitado Demo','quitado@demo.bo','lawyer')`,
    [lawyer, assistant, inactive, firmA]
  );

  clientA = (await q<{ id: string }>(owner, `insert into clients (full_name) values ('Cliente Ficticio A') returning id`))[0].id;
  caseA = (await q<{ id: string }>(owner, `insert into cases (client_id,title,responsible_id) values ($1,'Caso A',$2) returning id`, [clientA, owner]))[0].id;
  docA = (await q<{ id: string }>(owner, `insert into documents (case_id,title) values ($1,'Doc A') returning id`, [caseA]))[0].id;
  await q(owner, `insert into document_versions (document_id, version) values ($1, 1)`, [docA]);
  invA = (await q<{ id: string }>(owner, `insert into invoices (client_id,number) values ($1,'F-1') returning id`, [clientA]))[0].id;
  await q(owner, `insert into invoice_items (invoice_id, description, unit_price) values ($1,'Honorarios',100)`, [invA]);
  await q(owner, `insert into payments (invoice_id, amount) values ($1, 50)`, [invA]);
  await q(owner, `insert into time_entries (case_id, minutes, rate) values ($1, 30, 200)`, [caseA]);
  await q(owner, `insert into tasks (title) values ('Tarea A')`);
  await q(owner, `insert into appointments (title, starts_at) values ('Cita A', now())`);
  await q(owner, `insert into ai_audit_log (feature, summary) values ('chat','demo')`);

  clientB = (await q<{ id: string }>(ownerB, `insert into clients (full_name) values ('Cliente Ficticio B') returning id`))[0].id;
  caseB = (await q<{ id: string }>(ownerB, `insert into cases (client_id,title) values ($1,'Caso B') returning id`, [clientB]))[0].id;
  await q(ownerB, `insert into invoices (client_id,number) values ($1,'F-1')`, [clientB]);

  await db.query(`insert into profiles (id, firm_id, full_name, role, client_id) values ($1,$2,'Cliente Portal','client',$3)`, [portal, firmA, clientA]);
  // el titular quita a "inactive"
  await q(owner, `select set_member_active($1, false)`, [inactive]);
});

describe("lectura por rol (mismo despacho)", () => {
  const readable: Record<string, string[]> = {
    owner: ["clients", "cases", "case_events", "appointments", "tasks", "documents", "document_versions", "invoices", "invoice_items", "payments", "time_entries", "ai_audit_log"],
    lawyer: ["clients", "cases", "appointments", "tasks", "documents", "document_versions", "invoices", "invoice_items", "payments", "time_entries", "ai_audit_log"],
    assistant: ["clients", "cases", "appointments", "tasks", "documents", "document_versions"],
  };
  const who = () => ({ owner, lawyer, assistant }) as Record<string, string>;

  for (const role of ["owner", "lawyer", "assistant"]) {
    for (const t of readable[role].filter((t) => t !== "case_events")) {
      it(`${role} lee ${t}`, async () => {
        expect(await count(who()[role], t)).toBeGreaterThan(0);
      });
    }
  }
  for (const t of ["invoices", "invoice_items", "payments", "time_entries", "ai_audit_log"]) {
    it(`asistente NO ve ${t}`, async () => {
      expect(await count(assistant, t)).toBe(0);
    });
  }
  it("asistente no puede insertar en cobros ni tiempo", async () => {
    await expect(run(assistant, `insert into invoices (client_id,number) values ($1,'F-X')`, [clientA])).rejects.toThrow();
    await expect(run(assistant, `insert into payments (invoice_id, amount) values ($1, 5)`, [invA])).rejects.toThrow();
    await expect(run(assistant, `insert into time_entries (minutes, rate) values (10, 99)`)).rejects.toThrow();
  });
  it("asistente no modifica ni borra cobros", async () => {
    expect((await run(assistant, `update invoices set notes='x'`)).affectedRows).toBe(0);
    expect((await run(assistant, `delete from payments`)).affectedRows).toBe(0);
  });
  it("asistente puede registrar uso de IA pero no leerlo", async () => {
    await run(assistant, `insert into ai_audit_log (feature, summary) values ('chat','del asistente')`);
    expect(await count(assistant, "ai_audit_log")).toBe(0);
    expect(await count(owner, "ai_audit_log")).toBe(2);
    await run(owner, `delete from ai_audit_log where summary='del asistente'`);
  });
});

describe("escritura por rol", () => {
  it("asistente crea y edita clientes, casos, tareas, agenda y documentos", async () => {
    const c = (await q<{ id: string }>(assistant, `insert into clients (full_name) values ('Cliente del asistente') returning id`))[0].id;
    expect((await run(assistant, `update clients set phone='123' where id=$1`, [c])).affectedRows).toBe(1);
    const k = (await q<{ id: string }>(assistant, `insert into cases (client_id,title) values ($1,'Caso asistente') returning id`, [c]))[0].id;
    expect((await run(assistant, `update cases set stage='en_tramite' where id=$1`, [k])).affectedRows).toBe(1);
    await run(assistant, `insert into tasks (title) values ('t')`);
    await run(assistant, `insert into appointments (title, starts_at) values ('a', now())`);
    await run(assistant, `insert into documents (title) values ('d')`);
    expect((await run(assistant, `update documents set title='d2' where title='d'`)).affectedRows).toBe(1);
  });

  it("asistente no cambia el responsable ni archiva casos", async () => {
    await expect(run(assistant, `update cases set responsible_id = $2 where id=$1`, [caseA, assistant])).rejects.toThrow(/responsable/);
    await expect(run(assistant, `update cases set deleted_at = now() where id=$1`, [caseA])).rejects.toThrow(/archivar/);
  });

  it("abogado y titular sí pueden reasignar y archivar", async () => {
    expect((await run(lawyer, `update cases set responsible_id = $2 where id=$1`, [caseA, lawyer])).affectedRows).toBe(1);
    expect((await run(owner, `update cases set responsible_id = $2 where id=$1`, [caseA, owner])).affectedRows).toBe(1);
  });

  it("abogado gestiona cobros y tiempo", async () => {
    const id = (await q<{ id: string }>(lawyer, `insert into invoices (client_id,number) values ($1,'F-L1') returning id`, [clientA]))[0].id;
    await run(lawyer, `insert into payments (invoice_id, amount) values ($1, 10)`, [id]);
    await run(lawyer, `insert into time_entries (minutes, rate) values (15, 100)`);
    expect((await run(lawyer, `update invoices set status='enviada' where id=$1`, [id])).affectedRows).toBe(1);
  });

  it("abogado NO borra definitivamente clientes, casos, documentos, facturas ni pagos", async () => {
    for (const t of ["clients", "cases", "documents", "invoices", "payments"]) {
      expect((await run(lawyer, `delete from ${t}`)).affectedRows, t).toBe(0);
    }
  });
  it("asistente NO borra clientes, casos ni documentos", async () => {
    for (const t of ["clients", "cases", "documents"]) {
      expect((await run(assistant, `delete from ${t}`)).affectedRows, t).toBe(0);
    }
  });
  it("asistente sí puede borrar tareas y citas", async () => {
    expect((await run(assistant, `delete from tasks`)).affectedRows).toBeGreaterThan(0);
    expect((await run(assistant, `delete from appointments`)).affectedRows).toBeGreaterThan(0);
  });
  it("titular borra definitivamente", async () => {
    const id = (await q<{ id: string }>(owner, `insert into payments (invoice_id, amount) values ($1, 1) returning id`, [invA]))[0].id;
    expect((await run(owner, `delete from payments where id=$1`, [id])).affectedRows).toBe(1);
  });
});

describe("perfiles y gestión del equipo", () => {
  it("el asistente solo ve su propio perfil; el directorio da nombre y rol", async () => {
    const rows = await q<{ id: string }>(assistant, `select id from profiles`);
    expect(rows.map((r) => r.id)).toEqual([assistant]);
    const dir = await q<Record<string, unknown>>(assistant, `select * from team_directory()`);
    expect(dir.length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(dir[0]).sort()).toEqual(["active", "full_name", "id", "role"]);
  });
  it("titular y abogado ven al equipo del despacho (no al otro)", async () => {
    expect(await count(owner, "profiles")).toBe(5); // 4 staff + 1 cliente portal
    expect(await count(lawyer, "profiles")).toBe(5);
  });
  it("solo el titular cambia roles y quita miembros", async () => {
    await expect(run(lawyer, `select set_member_role($1,'owner')`, [lawyer])).rejects.toThrow(/Solo el titular/);
    await expect(run(assistant, `select set_member_active($1,false)`, [lawyer])).rejects.toThrow(/Solo el titular/);
    await run(owner, `select set_member_role($1,'lawyer')`, [assistant]);
    await run(owner, `select set_member_role($1,'assistant')`, [assistant]);
  });
  it("no se puede asignar rol client ni tocar cuentas de cliente", async () => {
    await expect(run(owner, `select set_member_role($1,'client')`, [lawyer])).rejects.toThrow();
    await expect(run(owner, `select set_member_role($1,'lawyer')`, [portal])).rejects.toThrow(/portal/);
  });
  it("no se puede cambiar/quitar al último titular ni quitarse a sí mismo", async () => {
    await expect(run(owner, `select set_member_role($1,'lawyer')`, [owner])).rejects.toThrow(/último titular/);
    await expect(run(owner, `select set_member_active($1,false)`, [owner])).rejects.toThrow();
  });
  it("con dos titulares sí se puede bajar a uno", async () => {
    await run(owner, `select set_member_role($1,'owner')`, [lawyer]);
    await run(owner, `select set_member_role($1,'lawyer')`, [lawyer]);
  });
  it("no se puede tocar a miembros de otro despacho", async () => {
    await expect(run(ownerB, `select set_member_role($1,'assistant')`, [lawyer])).rejects.toThrow(/No encontré/);
  });
  it("nadie se cambia su propio rol o estado por UPDATE directo", async () => {
    await expect(run(lawyer, `update profiles set role='owner' where id=$1`, [lawyer])).rejects.toThrow();
    await expect(run(lawyer, `update profiles set active=false where id=$1`, [lawyer])).rejects.toThrow();
  });
  it("un usuario quitado no puede reactivarse solo", async () => {
    await expect(run(inactive, `update profiles set active=true where id=$1`, [inactive])).rejects.toThrow();
    const row = await q<{ active: boolean }>(owner, `select active from profiles where id=$1`, [inactive]);
    expect(row[0].active).toBe(false);
  });
});

describe("usuarios inactivos", () => {
  it("no ven nada del despacho (solo su propio perfil)", async () => {
    for (const t of ["clients", "cases", "documents", "invoices", "tasks", "firms"]) {
      expect(await count(inactive, t), t).toBe(0);
    }
    expect((await q(inactive, `select id from profiles`)).length).toBe(1);
    await expect(run(inactive, `insert into clients (full_name) values ('x')`)).rejects.toThrow();
  });
  it("is_staff/current_firm_id devuelven false/null", async () => {
    const r = await q<{ s: boolean; f: string | null }>(inactive, `select is_staff() s, current_firm_id() f`);
    expect(r[0]).toEqual({ s: false, f: null });
  });
  it("el titular puede reactivarlo y vuelve a ver todo", async () => {
    await run(owner, `select set_member_active($1,true)`, [inactive]);
    expect(await count(inactive, "clients")).toBeGreaterThan(0);
    await run(owner, `select set_member_active($1,false)`, [inactive]);
  });
});

describe("límite de miembros", () => {
  it("máximo 10 activos por despacho", async () => {
    const extra: string[] = [];
    for (let i = 0; i < 6; i++) extra.push(await createUser(db, `extra${i}@demo.bo`));
    // activos hoy: owner, lawyer, assistant = 3  → caben 7 más
    for (let i = 0; i < 6; i++) {
      await db.query(`insert into profiles (id, firm_id, full_name, role) values ($1,$2,$3,'assistant')`, [extra[i], firmA, `Extra ${i}`]);
    }
    const last = await createUser(db, "extra-6@demo.bo");
    await db.query(`insert into profiles (id, firm_id, full_name, role) values ($1,$2,'Extra 6','assistant')`, [last, firmA]); // 10
    const eleven = await createUser(db, "extra-7@demo.bo");
    await expect(db.query(`insert into profiles (id, firm_id, full_name, role) values ($1,$2,'Extra 7','assistant')`, [eleven, firmA])).rejects.toThrow(/10 miembros/);
    // reactivar al quitado tampoco cabe
    await expect(run(owner, `select set_member_active($1,true)`, [inactive])).rejects.toThrow(/10 miembros/);
    // los clientes del portal no cuentan
    const p2 = await createUser(db, "portal2@demo.bo");
    await db.query(`insert into profiles (id, firm_id, full_name, role, client_id) values ($1,$2,'Portal 2','client',$3)`, [p2, firmA, clientA]);
  });
});

describe("aislamiento entre despachos", () => {
  it("cada rol del despacho A no ve ni toca datos del B", async () => {
    for (const u of [owner, lawyer, assistant]) {
      expect((await q(u, `select id from cases where id=$1`, [caseB])).length).toBe(0);
      expect((await q(u, `select id from clients where id=$1`, [clientB])).length).toBe(0);
      expect((await run(u, `update cases set title='hack' where id=$1`, [caseB])).affectedRows).toBe(0);
      expect((await run(u, `delete from cases where id=$1`, [caseB])).affectedRows).toBe(0);
      await expect(run(u, `insert into clients (firm_id, full_name) values ($1,'Intruso')`, [firmB])).rejects.toThrow();
    }
  });
  it("el titular B no ve facturas ni perfiles del A", async () => {
    expect(await count(ownerB, "invoices")).toBe(1);
    const ids = (await q<{ id: string }>(ownerB, `select id from profiles`)).map((r) => r.id);
    expect(ids).toEqual([ownerB]);
  });
});

describe("portal del cliente no cambia", () => {
  it("sigue viendo su caso, pero no cobros en borrador ni equipo", async () => {
    expect((await q(portal, `select id from cases`)).length).toBe(1);
    // solo la factura "enviada" (F-L1); F-1 está en borrador
    expect((await q<{ number: string }>(portal, `select number from invoices`)).map((r) => r.number)).toEqual(["F-L1"]);
    expect(await count(portal, "time_entries")).toBe(0);
    expect(await count(portal, "ai_audit_log")).toBe(0);
    expect((await q(portal, `select id from profiles`)).map((r: { id?: string }) => r.id)).toEqual([portal]);
    await expect(run(portal, `insert into clients (full_name) values ('x')`)).rejects.toThrow();
  });
});
