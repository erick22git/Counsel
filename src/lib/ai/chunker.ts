// Limpieza de wikitext (Lexivox es un MediaWiki) y división en artículos. Funciones puras, con tests.

export function wikitextToPlain(w: string): string {
  let t = w;
  t = t.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "").replace(/<ref[^>]*\/>/gi, "");
  t = t.replace(/<!--[\s\S]*?-->/g, "");
  for (let i = 0; i < 4; i++) t = t.replace(/\{\{[^{}]*\}\}/g, "");
  t = t.replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1");
  t = t.replace(/\[(?:https?:\/\/\S+)\s+([^\]]+)\]/g, "$1").replace(/\[https?:\/\/\S+\]/g, "");
  t = t.replace(/'{2,5}/g, "");
  t = t.replace(/<[^>]+>/g, "");
  t = t.replace(/^[*#:;]+\s*/gm, "");
  t = t.replace(/^=+\s*(.*?)\s*=+\s*$/gm, "\n## $1\n");
  return t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export interface Chunk { article: string | null; heading: string | null; content: string }

const SUFFIX = "bis|ter|qu[aá]ter|quinquies|sexies|septies|octies|nonies|decies";
const ART = new RegExp(String.raw`^(?:##\s*)?(Art[íi]culo|Art\.)\s*(\d+\s*[°º]?(?:[\s.\-]*(?:${SUFFIX})(?![a-záéíóú]))?)\s*[.:\-–—)]*\s*(.*)$`, "i");
/** Encabezados estructurales sin formato wiki: "CAPÍTULO IV", "TÍTULO II", "LIBRO PRIMERO", "Sección 2". */
const STRUCT = /^(LIBRO|T[ÍI]TULO|CAP[ÍI]TULO|SECCI[ÓO]N|PARTE)\s+([IVXLC]+|\d+|[A-ZÁÉÍÓÚa-záéíóú]+)\b[.\s:\-–—]*(.*)$/;

/** Normaliza el rótulo de artículo: "5 BIS" -> "5 bis", "12-bis" -> "12 bis". */
export function normalizeArticleLabel(raw: string): string {
  return raw.replace(/[.]$/, "").replace(/\s*([°º])/, "$1").replace(/[\s.\-]+(?=[a-záéíóú])/i, " ").replace(/\s+/g, " ").trim().replace(/\b(BIS|TER)\b/g, (m) => m.toLowerCase());
}

const MONTHS: Record<string, string> = { enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06", julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10", noviembre: "11", diciembre: "12" };

/** Fecha de la norma (YYYY-MM-DD) si el wikitext la trae: "fecha = 25 de julio de 1975", "de 2 de abril de 1976" o ISO. */
export function extractNormDate(wikitext: string): string | null {
  const head = wikitext.slice(0, 4000);
  const iso = /\b(1[89]\d{2}|20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/.exec(head);
  if (iso) return iso[0];
  const m = /\b(\d{1,2})\s*(?:º|°)?\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+(1[89]\d{2}|20\d{2})\b/i.exec(head);
  if (!m) return null;
  return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
}

/** Divide en artículos. Mantiene el último encabezado (## Capítulo…) como contexto. Fragmentos muy largos se parten por párrafos. */
export function chunkByArticle(plain: string, maxChars = 1800): Chunk[] {
  const out: Chunk[] = [];
  let heading: string | null = null;
  let cur: { article: string; lines: string[]; heading: string | null } | null = null;

  const flush = () => {
    if (!cur) return;
    const text = cur.lines.join("\n").trim();
    if (text) {
      if (text.length <= maxChars) out.push({ article: cur.article, heading: cur.heading, content: text });
      else {
        let buf = "";
        let part = 1;
        for (const para of text.split(/\n{2,}|\n(?=[IVXL]+\.\s|\d+\.\s|[a-z]\)\s|Par[áa]grafo\b)/i)) {
          if ((buf + "\n" + para).length > maxChars && buf) {
            out.push({ article: `${cur.article} (parte ${part++})`, heading: cur.heading, content: buf.trim() });
            buf = "";
          }
          buf += (buf ? "\n" : "") + para;
        }
        if (buf.trim()) out.push({ article: part > 1 ? `${cur.article} (parte ${part})` : cur.article, heading: cur.heading, content: buf.trim() });
      }
    }
    cur = null;
  };

  for (const raw of plain.split("\n")) {
    const line = raw.trim();
    if (!line) {
      cur?.lines.push("");
      continue;
    }
    const m = ART.exec(line);
    if (m) {
      flush();
      cur = { article: `Artículo ${normalizeArticleLabel(m[2])}`, lines: [line], heading };
    } else if (line.startsWith("## ")) {
      flush();
      heading = line.slice(3).trim();
    } else if (STRUCT.test(line) && line.length < 120 && (!cur || /^[A-ZÁÉÍÓÚ\s\dIVXLC.:\-–—]+$/.test(line) || /^(CAP|T[ÍI]T|LIBRO|SECC)/.test(line))) {
      flush();
      heading = line;
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  flush();
  return out;
}

const ENT: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", ordm: "º", ordf: "ª", deg: "°" };

/** XHTML de una norma de Lexivox (/norms/<ID>.xhtml) → texto plano con "## encabezados" y un renglón por párrafo/inciso. */
export function htmlToPlain(html: string): string {
  let t = html.slice(Math.max(0, html.search(/<body/i)));
  t = t.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, "");
  t = t.replace(/<!--[\s\S]*?-->/g, "");
  t = t.replace(/<img[^>]*>/gi, "");
  t = t.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_m, inner: string) => `\n## ${inner.replace(/<br\s*\/?>/gi, " — ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()}\n`);
  t = t.replace(/<li[^>]*>/gi, "\n- ").replace(/<\/(p|li|div|tr|ol|ul|table)>/gi, "\n").replace(/<(p|div|tr|ol|ul|table)[^>]*>/gi, "\n").replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  t = t.replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_m, n: string) => String.fromCodePoint(parseInt(n, 16))).replace(/&([a-z]+);/gi, (m, n: string) => ENT[n.toLowerCase()] ?? m);
  return t.replace(/[ \t\r]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Título de la página XHTML ("Bolivia: Código Procesal Civil, 19 de noviembre de 2013"). */
export function htmlTitle(html: string): string | null {
  const m = /<title>([\s\S]*?)<\/title>/i.exec(html);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}
