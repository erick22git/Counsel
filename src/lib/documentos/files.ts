// Lógica pura de archivos: saneado de nombres, rutas de Storage y validación.

export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB (igual que el bucket)

export const ALLOWED_EXTENSIONS: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  txt: "text/plain",
};

export const ACCEPT_ATTR = Object.keys(ALLOWED_EXTENSIONS).map((e) => `.${e}`).join(",");
export const ALLOWED_LABEL = "PDF, Word, Excel, JPG, PNG o TXT";

export function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 && i < name.length - 1 ? name.slice(i + 1).toLowerCase() : "";
}

/** Quita tildes, espacios y caracteres raros; conserva la extensión. Nunca devuelve vacío. */
export function sanitizeFileName(rawName: string): string {
  const name = rawName.split(/[\\/]/).pop() ?? "";
  const ext = extensionOf(name);
  const base = ext ? name.slice(0, name.length - ext.length - 1) : name;
  const clean = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80)
    .replace(/-+$/g, "");
  const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 8);
  const stem = clean || "documento";
  return safeExt ? `${stem}.${safeExt}` : stem;
}

/** Ruta obligatoria: {firm_id}/{case_id|general}/{uuid}-{nombre-saneado} */
export function buildStoragePath(opts: { firmId: string; caseId?: string | null; uuid: string; fileName: string }): string {
  return `${opts.firmId}/${opts.caseId || "general"}/${opts.uuid}-${sanitizeFileName(opts.fileName)}`;
}

const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

/** Verifica que una ruta tenga la forma esperada y pertenezca al despacho (y al caso, si se indica). */
export function isValidStoragePath(path: string, firmId: string, caseId?: string | null): boolean {
  const re = new RegExp(`^(${UUID})/(general|${UUID})/${UUID}-[a-z0-9._-]+$`);
  const m = re.exec(path);
  if (!m || m[1] !== firmId) return false;
  if (caseId !== undefined) return m[2] === (caseId || "general");
  return true;
}

export type FileCheck = { ok: true; mime: string } | { ok: false; error: string };

export function validateFile(file: { name: string; size: number; type?: string }): FileCheck {
  if (file.size <= 0) return { ok: false, error: "El archivo está vacío. Elija otro archivo." };
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: `El archivo pesa ${formatBytes(file.size)} y el máximo es 25 MB. Comprímalo o divídalo.` };
  }
  const ext = extensionOf(file.name);
  const mime = ALLOWED_EXTENSIONS[ext];
  if (!mime) return { ok: false, error: `Este tipo de archivo no está permitido. Use ${ALLOWED_LABEL}.` };
  return { ok: true, mime };
}

export function formatBytes(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export type DocTipo = "escrito" | "pdf" | "word" | "excel" | "imagen" | "otro";

export function docTipo(doc: { kind: string; mime: string | null }): DocTipo {
  if (doc.kind === "escrito") return "escrito";
  const m = doc.mime ?? "";
  if (m === "application/pdf") return "pdf";
  if (m.includes("word")) return "word";
  if (m.includes("excel") || m.includes("spreadsheet")) return "excel";
  if (m.startsWith("image/")) return "imagen";
  return "otro";
}

export const TIPO_LABEL: Record<DocTipo, string> = {
  escrito: "Escrito",
  pdf: "PDF",
  word: "Word",
  excel: "Excel",
  imagen: "Imagen",
  otro: "Otro",
};

export function previewKind(mime: string | null): "pdf" | "imagen" | null {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg" || mime === "image/png") return "imagen";
  return null;
}

/** Título sugerido a partir del nombre del archivo. */
export function titleFromFileName(name: string): string {
  const ext = extensionOf(name);
  const base = ext ? name.slice(0, name.length - ext.length - 1) : name;
  return base.replace(/_+/g, " ").trim() || "Documento";
}
