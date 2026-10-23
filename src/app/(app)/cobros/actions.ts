"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { balanceCents, fromCents, itemsTotalCents, nextInvoiceNumber, paymentsTotalCents, toCents } from "@/lib/cobros/money";
import { firstError, invoiceSchema, paymentSchema, type ActionResult } from "@/lib/cobros/schemas";
import { fmtMoney } from "@/lib/format";
import { methodLabel } from "@/lib/cobros/status";

const uuid = z.string().uuid();
const MSG = "No se pudo guardar. Intenta de nuevo.";

function refresh(id?: string) {
  revalidatePath("/cobros");
  revalidatePath("/tiempo");
  if (id) revalidatePath(`/cobros/${id}`);
}

/** Crea un cobro con número correlativo "F-0001" calculado aquí; reintenta si otro usuario tomó el número. */
export async function createInvoice(input: unknown): Promise<ActionResult<{ id: string; number: string }>> {
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const v = parsed.data;
  const { supabase } = await requireStaff();

  // Las horas deben seguir pendientes (nadie más las cobró).
  if (v.time_entry_ids.length) {
    const { data: free } = await supabase.from("time_entries").select("id").in("id", v.time_entry_ids).is("invoice_id", null);
    if ((free?.length ?? 0) !== v.time_entry_ids.length) return { ok: false, error: "Algunas horas ya fueron cobradas. Vuelve a cargarlas." };
  }

  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: nums, error: nErr } = await supabase.from("invoices").select("number").like("number", "F-%");
    if (nErr) return { ok: false, error: MSG };
    const number = nextInvoiceNumber((nums ?? []).map((r) => r.number as string));
    const { data: inv, error } = await supabase
      .from("invoices")
      .insert({
        client_id: v.client_id,
        case_id: v.case_id ?? null,
        number,
        status: "borrador",
        currency: v.currency,
        issue_date: v.issue_date,
        due_date: v.due_date ?? null,
        notes: v.notes?.trim() || null,
      })
      .select("id, number")
      .single();
    if (error) {
      if (error.code === "23505") continue; // número repetido: recalcular
      return { ok: false, error: MSG };
    }
    const { error: iErr } = await supabase
      .from("invoice_items")
      .insert(v.items.map((i) => ({ invoice_id: inv.id, description: i.description, quantity: i.quantity, unit_price: i.unit_price })));
    if (iErr) {
      await supabase.from("invoices").delete().eq("id", inv.id);
      return { ok: false, error: MSG };
    }
    if (v.time_entry_ids.length) {
      await supabase.from("time_entries").update({ invoice_id: inv.id }).in("id", v.time_entry_ids).is("invoice_id", null);
    }
    refresh();
    return { ok: true, id: inv.id, number: inv.number };
  }
  return { ok: false, error: "No se pudo asignar el número. Intenta de nuevo." };
}

/** Horas facturables sin cobrar de un caso. */
export async function getPendingHours(caseId: unknown) {
  const id = uuid.safeParse(caseId);
  if (!id.success) return { ok: false as const, error: "Caso no válido" };
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("time_entries")
    .select("id, description, minutes, rate, worked_on")
    .eq("case_id", id.data)
    .eq("billable", true)
    .is("invoice_id", null)
    .order("worked_on");
  if (error) return { ok: false as const, error: MSG };
  return {
    ok: true as const,
    entries: (data ?? []).map((e) => ({ id: e.id as string, description: e.description as string | null, minutes: e.minutes as number, rate: Number(e.rate), worked_on: e.worked_on as string })),
  };
}

export async function markSent(invoiceId: unknown): Promise<ActionResult> {
  const id = uuid.safeParse(invoiceId);
  if (!id.success) return { ok: false, error: "Cobro no válido" };
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.from("invoices").update({ status: "enviada" }).eq("id", id.data).eq("status", "borrador").select("id");
  if (error || !data?.length) return { ok: false, error: "Solo los borradores se pueden marcar como enviados." };
  refresh(id.data);
  return { ok: true };
}

/** Anula y libera las horas ligadas. Devuelve lo necesario para Deshacer. */
export async function voidInvoice(invoiceId: unknown): Promise<ActionResult<{ prevStatus: string; prevPaidAt: string | null; releasedIds: string[] }>> {
  const id = uuid.safeParse(invoiceId);
  if (!id.success) return { ok: false, error: "Cobro no válido" };
  const { supabase } = await requireStaff();
  const { data: inv } = await supabase.from("invoices").select("status, paid_at").eq("id", id.data).maybeSingle();
  if (!inv) return { ok: false, error: "No se encontró el cobro." };
  if (inv.status === "anulada") return { ok: false, error: "Este cobro ya está anulado." };
  const { data: linked } = await supabase.from("time_entries").select("id").eq("invoice_id", id.data);
  const { error } = await supabase.from("invoices").update({ status: "anulada" }).eq("id", id.data);
  if (error) return { ok: false, error: MSG };
  const releasedIds = (linked ?? []).map((r) => r.id as string);
  if (releasedIds.length) await supabase.from("time_entries").update({ invoice_id: null }).in("id", releasedIds);
  refresh(id.data);
  return { ok: true, prevStatus: inv.status as string, prevPaidAt: (inv.paid_at as string | null) ?? null, releasedIds };
}

export async function restoreInvoice(input: unknown): Promise<ActionResult> {
  const p = z
    .object({
      id: uuid,
      prevStatus: z.enum(["borrador", "enviada", "pagada"]),
      prevPaidAt: z.string().nullable(),
      releasedIds: z.array(uuid),
    })
    .safeParse(input);
  if (!p.success) return { ok: false, error: "Datos no válidos" };
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("invoices").update({ status: p.data.prevStatus, paid_at: p.data.prevPaidAt }).eq("id", p.data.id);
  if (error) return { ok: false, error: MSG };
  if (p.data.releasedIds.length) await supabase.from("time_entries").update({ invoice_id: p.data.id }).in("id", p.data.releasedIds).is("invoice_id", null);
  refresh(p.data.id);
  return { ok: true };
}

async function loadBalance(supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"], invoiceId: string) {
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, number, status, currency, case_id, invoice_items(quantity, unit_price), payments(amount)")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) return null;
  const items = (inv.invoice_items ?? []) as { quantity: number; unit_price: number }[];
  const pays = (inv.payments ?? []) as { amount: number }[];
  return { inv, totalCents: itemsTotalCents(items), paidCents: paymentsTotalCents(pays), balance: balanceCents(items, pays) };
}

/** Registra un pago. No puede exceder el saldo; al cubrir el total pasa a 'pagada'. */
export async function addPayment(input: unknown, opts: { restore?: boolean } = {}): Promise<ActionResult<{ paymentId: string; nowPaid: boolean }>> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const v = parsed.data;
  const { supabase, profile } = await requireStaff();
  const b = await loadBalance(supabase, v.invoice_id);
  if (!b) return { ok: false, error: "No se encontró el cobro." };
  if (b.inv.status === "anulada") return { ok: false, error: "Este cobro está anulado." };
  const amountCents = toCents(v.amount);
  if (amountCents > b.balance) return { ok: false, error: `El pago no puede ser mayor al saldo (${fmtMoney(fromCents(b.balance), b.inv.currency)}).` };

  const { data: pay, error } = await supabase
    .from("payments")
    .insert({ invoice_id: v.invoice_id, amount: fromCents(amountCents), method: v.method, paid_on: v.paid_on, note: v.note?.trim() || null })
    .select("id")
    .single();
  if (error) return { ok: false, error: MSG };

  const nowPaid = amountCents === b.balance;
  if (nowPaid) {
    await supabase.from("invoices").update({ status: "pagada", paid_at: new Date().toISOString() }).eq("id", v.invoice_id);
  }
  if (b.inv.case_id && !opts.restore) {
    await supabase.from("case_events").insert({
      case_id: b.inv.case_id,
      kind: "pago",
      title: `Pago de ${fmtMoney(fromCents(amountCents), b.inv.currency)} (${b.inv.number})`,
      body: `Método: ${methodLabel(v.method)}${v.note?.trim() ? `. ${v.note.trim()}` : ""}`,
      visible_to_client: false,
      created_by: profile.id,
    });
  }
  refresh(v.invoice_id);
  return { ok: true, paymentId: pay.id, nowPaid };
}

/** Quita un pago equivocado (se puede deshacer con addPayment + restore). */
export async function removePayment(paymentId: unknown): Promise<ActionResult<{ payment: { invoice_id: string; amount: number; method: string; paid_on: string; note: string | null } }>> {
  const id = uuid.safeParse(paymentId);
  if (!id.success) return { ok: false, error: "Pago no válido" };
  const { supabase } = await requireStaff();
  const { data: pay } = await supabase.from("payments").select("invoice_id, amount, method, paid_on, note").eq("id", id.data).maybeSingle();
  if (!pay) return { ok: false, error: "No se encontró el pago." };
  const { error } = await supabase.from("payments").delete().eq("id", id.data);
  if (error) return { ok: false, error: MSG };
  const b = await loadBalance(supabase, pay.invoice_id as string);
  if (b && b.inv.status === "pagada" && b.balance > 0) {
    await supabase.from("invoices").update({ status: "enviada", paid_at: null }).eq("id", pay.invoice_id);
  }
  refresh(pay.invoice_id as string);
  return { ok: true, payment: { invoice_id: pay.invoice_id as string, amount: Number(pay.amount), method: pay.method as string, paid_on: pay.paid_on as string, note: (pay.note as string | null) ?? null } };
}
