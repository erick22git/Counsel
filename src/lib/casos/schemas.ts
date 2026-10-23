import { z } from "zod";

const opt = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const MATTER_IDS = ["civil", "penal", "familia", "laboral", "comercial", "administrativo", "constitucional", "otro"] as const;
export const STAGE_VALUES = ["nuevo", "en_tramite", "audiencia", "resolucion", "cerrado"] as const;

export const clientSchema = z.object({
  kind: z.enum(["persona", "empresa"]),
  full_name: z.string().trim().min(2, "Escribe el nombre (mínimo 2 letras).").max(200),
  ci_nit: opt(40),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "El correo no parece válido."),
  phone: opt(40),
  address: opt(300),
  notes: opt(5000),
});
export type ClientInput = z.input<typeof clientSchema>;

export const caseSchema = z.object({
  title: z.string().trim().min(2, "Escribe un título (mínimo 2 letras).").max(200),
  client_id: z.string().uuid("Elige un cliente."),
  matter: z.enum(MATTER_IDS),
  court: opt(200),
  opponent: opt(200),
  case_number: opt(60),
  description: opt(10000),
});
export type CaseInput = z.input<typeof caseSchema>;

export const moveSchema = z.object({
  id: z.string().uuid(),
  stage: z.enum(STAGE_VALUES),
  position: z.number().finite(),
  fromStage: z.enum(STAGE_VALUES),
});
