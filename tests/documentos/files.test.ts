import { describe, it, expect } from "vitest";
import {
  sanitizeFileName, buildStoragePath, isValidStoragePath, validateFile, formatBytes, docTipo, previewKind, titleFromFileName, MAX_FILE_BYTES,
} from "@/lib/documentos/files";

const FIRM = "11111111-1111-4111-8111-111111111111";
const CASE = "22222222-2222-4222-8222-222222222222";
const UID = "33333333-3333-4333-8333-333333333333";

describe("sanitizeFileName", () => {
  it("quita tildes, espacios y símbolos", () => {
    expect(sanitizeFileName("Demanda de Divorcio (final) ñandú.PDF")).toBe("demanda-de-divorcio-final-nandu.pdf");
  });
  it("evita rutas y nombres vacíos", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("???.pdf")).toBe("documento.pdf");
  });
  it("limita el largo", () => {
    expect(sanitizeFileName("a".repeat(300) + ".pdf").length).toBeLessThanOrEqual(85);
  });
});

describe("buildStoragePath / isValidStoragePath", () => {
  it("usa caso o general", () => {
    expect(buildStoragePath({ firmId: FIRM, caseId: CASE, uuid: UID, fileName: "Mi Acta.pdf" })).toBe(`${FIRM}/${CASE}/${UID}-mi-acta.pdf`);
    expect(buildStoragePath({ firmId: FIRM, caseId: null, uuid: UID, fileName: "x.txt" })).toBe(`${FIRM}/general/${UID}-x.txt`);
  });
  it("valida despacho y caso", () => {
    const p = buildStoragePath({ firmId: FIRM, caseId: CASE, uuid: UID, fileName: "a.pdf" });
    expect(isValidStoragePath(p, FIRM)).toBe(true);
    expect(isValidStoragePath(p, FIRM, CASE)).toBe(true);
    expect(isValidStoragePath(p, FIRM, null)).toBe(false);
    expect(isValidStoragePath(p, UID)).toBe(false);
    expect(isValidStoragePath(`${FIRM}/../x`, FIRM)).toBe(false);
  });
});

describe("validateFile", () => {
  it("acepta tipos comunes", () => {
    expect(validateFile({ name: "a.PDF", size: 1000 })).toEqual({ ok: true, mime: "application/pdf" });
    expect(validateFile({ name: "a.docx", size: 1000 }).ok).toBe(true);
  });
  it("rechaza tipo, tamaño y vacío con mensaje en español", () => {
    const t = validateFile({ name: "virus.exe", size: 10 });
    expect(t.ok).toBe(false);
    if (!t.ok) expect(t.error).toMatch(/no está permitido/);
    const s = validateFile({ name: "a.pdf", size: MAX_FILE_BYTES + 1 });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.error).toMatch(/25 MB/);
    expect(validateFile({ name: "a.pdf", size: 0 }).ok).toBe(false);
    expect(validateFile({ name: "sinextension", size: 5 }).ok).toBe(false);
  });
  it("acepta exactamente 25 MB", () => {
    expect(validateFile({ name: "a.pdf", size: MAX_FILE_BYTES }).ok).toBe(true);
  });
});

describe("utilidades", () => {
  it("formatBytes", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5,0 MB");
    expect(formatBytes(null)).toBe("—");
  });
  it("docTipo y previewKind", () => {
    expect(docTipo({ kind: "escrito", mime: null })).toBe("escrito");
    expect(docTipo({ kind: "archivo", mime: "application/pdf" })).toBe("pdf");
    expect(docTipo({ kind: "archivo", mime: "image/png" })).toBe("imagen");
    expect(previewKind("image/jpeg")).toBe("imagen");
    expect(previewKind("text/plain")).toBeNull();
  });
  it("titleFromFileName", () => {
    expect(titleFromFileName("poder_notarial.pdf")).toBe("poder notarial");
  });
});
