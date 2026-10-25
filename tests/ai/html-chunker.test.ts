import { describe, expect, it } from "vitest";
import { chunkByArticle, htmlTitle, htmlToPlain, extractNormDate } from "@/lib/ai/chunker";
import { buildLawPlan, fetchNormHtml, normUrl, type FetchLike } from "../../scripts/ingest-core";

// Estructura real de Lexivox (/norms/<ID>.xhtml), con texto ficticio.
const XHTML = `<html><head><title>Bolivia: Norma de prueba, 19 de noviembre de 2013</title><style>p{color:red}</style></head>
<body><div class="margen"><img src="data:image/gif;base64,AAAA"/>
<h2><a name="a"> </a>Libro Primero<br/>Disposiciones generales</h2>
<h3>Título I<br/>Disposiciones fundamentales</h3>
<p><strong>Artículo 1°.- (Principios) </strong>. El proceso se sustenta en: <ol><li>Oralidad. Es la forma de desarrollar el proceso.</li><li>Legalidad. Se actúa conforme a ley.</li></ol></p>
<p><strong>Artículo 2°.- (Tutela) </strong>. La tutela es efectiva &amp; oportuna.</p>
<h3>Título II</h3>
<p><strong>Artículo 3 bis.- (Extra) </strong>. Texto del artículo con sufijo.</p>
</div></body></html>`;

describe("XHTML de Lexivox", () => {
  it("convierte a texto con encabezados y artículos", () => {
    const plain = htmlToPlain(XHTML);
    expect(plain).not.toMatch(/<|base64|color:red/);
    expect(plain).toContain("## Libro Primero — Disposiciones generales");
    expect(plain).toContain("& oportuna");
    const chunks = chunkByArticle(plain);
    expect(chunks.map((c) => c.article)).toEqual(["Artículo 1°", "Artículo 2°", "Artículo 3 bis"]);
    expect(chunks[0].heading).toMatch(/Disposiciones fundamentales/);
    expect(chunks[0].content).toMatch(/Oralidad/);
    expect(chunks[2].heading).toBe("Título II");
  });
  it("lee título y fecha de la norma", () => {
    expect(htmlTitle(XHTML)).toBe("Bolivia: Norma de prueba, 19 de noviembre de 2013");
    expect(extractNormDate(htmlTitle(XHTML)!)).toBe("2013-11-19");
  });
  it("arma el plan con URL de origen y atribución GFDL", () => {
    const plan = buildLawPlan({ code: "X", title: "Norma de prueba", page: "", norm: "BO-L-N1" }, XHTML);
    expect(plan.chunks).toHaveLength(3);
    expect(plan.originUrl).toBe(normUrl("BO-L-N1"));
    expect(plan.attribution).toMatch(/GFDL/);
    expect(plan.normDate).toBe("2013-11-19");
  });
  it("una norma inexistente (200 con aviso) se trata como 404 y no se reintenta", async () => {
    let calls = 0;
    const f: FetchLike = async () => {
      calls++;
      return { ok: true, status: 200, json: async () => ({}), text: async () => "alert('Norma inexistente en la base de datos')" };
    };
    await expect(fetchNormHtml("BO-X", f, { sleep: async () => {} })).rejects.toThrow(/no tiene la norma/);
    expect(calls).toBe(1);
  });
});
