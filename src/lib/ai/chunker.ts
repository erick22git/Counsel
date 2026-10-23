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

const ART = /^(?:##\s*)?(Art[íi]culo|Art\.)\s*(\d+(?:[°º]|\s?(?:bis|ter))?)\s*[.:\-–—]*\s*(.*)$/i;

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
        for (const para of text.split(/\n{2,}|\n(?=[IVX]+\.|\d+\.)/)) {
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
      cur = { article: `Artículo ${m[2].replace(/[.]$/, "")}`, lines: [line], heading };
    } else if (line.startsWith("## ")) {
      flush();
      heading = line.slice(3).trim();
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  flush();
  return out;
}
