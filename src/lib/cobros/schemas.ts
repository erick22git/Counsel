import { z } from "zod";
import { toCents } from "./money";

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida");
const num = (label: string) => z.number({ message: `${label} no es un número` }).finite();

export const itemSchema = z.object({
  description: z.string().trim().min(1, "Escribe una descripción").max(500),
  quantity: num("La cantidad").refine((n) => n > 0, "La cantidad debe ser mayor a 0").refine((n) => n < 1e7, "Cantidad demasiado grande"),
  unit_price: num("El precio").refine((n) => n >= 0, "El precio no puede ser negativo").refine((n) => n < 1e9, "Precio demasiado grande"),
});

export const invoiceSchema = z
  .object({
    client_id: uuid,
    case_id: uuid.nullable().optional(),
    currency: z.enum(["BOB", "USD"]).default("BOB"),
    issue_date: date,
    due_date: date.nullable().optional(),
    notes: z.string().max(4000).nullable().optional(),
    items: z.array(itemSchema).min(1, "Agrega al menos un ítem"),
    time_entry_ids: z.array(uuid).default([]),
  })
  .refine((v) => !v.due_date || v.due_date >= v.issue_date, { path: ["due_date"], message: "El vencimiento no puede ser antes de la fecha" })
  .refine((v) => v.items.reduce((s, i) => s + toCents(i.unit_price), 0) > 0, { path: ["items"], message: "El total debe ser mayor a 0" });

export const paymentSchema = z.object({
  invoice_id: uuid,
  amount: num("El monto").refine((n) => toCents(n) > 0, "El monto debe ser mayor a 0"),
  method: z.enum(["efectivo", "transferencia", "qr", "cheque", "otro"]),
  paid_on: date,
  note: z.string().max(500).nullable().optional(),
});

export const timeEntrySchema = z.object({
  case_id: uuid.nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  minutes: z.number().int("Los minutos deben ser enteros").min(1, "El tiempo debe ser mayor a 0").max(24 * 60, "Máximo 24 horas por entrada"),
  worked_on: date,
  billable: z.boolean(),
  rate: num("La tarifa").refine((n) => n >= 0, "La tarifa no puede ser negativa"),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type TimeEntryInput = z.infer<typeof timeEntrySchema>;

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export function firstError(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Datos no válidos";
}
