import { describe, it, expect } from "vitest";
import { toSearchQuery, usedCitations, invalidCitationMarkers, redactPII, sourcesBlock, stripHtml } from "@/lib/ai/text";
import { wikitextToPlain, chunkByArticle } from "@/lib/ai/chunker";

describe("toSearchQuery", () => {
  it("quita palabras vacías y acentos, une con OR", () => {
    expect(toSearchQuery("¿Qué dice la ley sobre el plazo para contestar una demanda?")).toBe("dice or ley or plazo or contestar or demanda");
    expect(toSearchQuery("de la el")).toBe("");
  });
});

describe("citas", () => {
  const sources = [{ n: "a" }, { n: "b" }, { n: "c" }];
  it("mapea solo marcadores existentes", () => {
    const used = usedCitations("Según [S2] y [S1]; también [S9]", sources);
    expect(used.map((u) => u.n)).toEqual([1, 2]);
  });
  it("detecta marcadores inventados", () => {
    expect(invalidCitationMarkers("ver [S1] y [S7] y [S0]", 3).sort()).toEqual([0, 7]);
  });
  it("marca fuentes demo en el prompt", () => {
    const b = sourcesBlock([{ code: "X", law_title: "Ley X", article: "Artículo 1", content: "texto", source_name: "Lexivox", source_url: null, license: "GFDL", is_demo: true }]);
    expect(b).toContain("[S1]");
    expect(b).toContain("DEMO");
  });
});

describe("redactPII", () => {
  it("oculta nombre, CI, correo y teléfono", () => {
    const t = redactPII("Juan Pérez Rojas (CI 1234567) escribió a juan@demo.bo, cel 71234567. Pérez insistió.", {
      names: ["Juan Pérez Rojas"], ids: ["1234567"],
    });
    expect(t).not.toMatch(/Juan|Pérez|1234567|juan@|71234567/);
    expect(t).toContain("[CLIENTE]");
  });
});

describe("stripHtml", () => {
  it("convierte HTML en texto", () => {
    expect(stripHtml("<p>Hola&nbsp;mundo</p><p>Dos</p>")).toBe("Hola mundo\nDos");
  });
});

describe("chunker de Lexivox", () => {
  const wiki = `{{Plantilla}}\n== Capítulo I ==\n'''Artículo 1.''' El [[contrato]] es el acuerdo.<ref>nota</ref>\n\n'''Artículo 2.-''' Segundo texto.\n== Capítulo II ==\nArtículo 3°. Tercero.`;
  it("limpia wikitext", () => {
    const p = wikitextToPlain(wiki);
    expect(p).not.toMatch(/\{\{|\[\[|'''|<ref/);
    expect(p).toContain("contrato");
  });
  it("divide por artículo con encabezado", () => {
    const chunks = chunkByArticle(wikitextToPlain(wiki));
    expect(chunks.map((c) => c.article)).toEqual(["Artículo 1", "Artículo 2", "Artículo 3°"]);
    expect(chunks[0].heading).toBe("Capítulo I");
    expect(chunks[2].heading).toBe("Capítulo II");
  });
});
