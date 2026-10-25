/**
 * Verifica que el código (src/**, scripts/**) use solo tablas, columnas y funciones que existen
 * en el esquema real (migraciones aplicadas en PGlite).
 *
 * Uso: npx tsx scripts/check-schema.ts   (sale con código 1 si hay diferencias)
 * También lo ejecuta tests/db/check-schema.test.ts.
 *
 * Es un análisis estático por expresiones regulares + un pequeño parser de literales:
 *  - `.from("tabla")` y `.rpc("fn", {params})`
 *  - columnas en `.select("a,b")`, filtros (`.eq/.is/.in/.order/...("col")`) y claves de
 *    literales en `.insert({...})`, `.insert([{...}])`, `.update({...})`, `.upsert(...)`.
 *  - Lo dinámico (variables, spreads, plantillas con ${}) se omite y se cuenta en `skipped`.
 */
import fs from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";

export type Usage = {
  file: string;
  line: number;
  kind: "table" | "column" | "rpc" | "rpc-arg";
  table?: string; // para columnas
  name: string; // tabla, columna o función
  fn?: string; // para rpc-arg
};

export type Schema = {
  tables: Map<string, Set<string>>; // tabla/vista -> columnas
  functions: Map<string, string[][]>; // función -> lista de sobrecargas con nombres de argumentos
};

const FILTER_METHODS = [
  "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in", "not", "order",
  "contains", "containedBy", "overlaps", "match", "or", "filter", "textSearch",
];
const NON_DB_PREFIX = new Set(["Array", "Buffer", "Object", "Uint8Array", "storage", "JSON", "Promise", "Set", "Map"]);

// ───────────────────────── Esquema real ─────────────────────────
export async function loadSchema(db: PGlite): Promise<Schema> {
  const cols = await db.query<{ table_name: string; column_name: string }>(
    `select table_name, column_name from information_schema.columns where table_schema = 'public'`
  );
  const tables = new Map<string, Set<string>>();
  for (const r of cols.rows) {
    if (!tables.has(r.table_name)) tables.set(r.table_name, new Set());
    tables.get(r.table_name)!.add(r.column_name);
  }
  const fns = await db.query<{ proname: string; args: string[] | null }>(
    `select p.proname, p.proargnames as args
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'`
  );
  const functions = new Map<string, string[][]>();
  for (const r of fns.rows) {
    if (!functions.has(r.proname)) functions.set(r.proname, []);
    functions.get(r.proname)!.push((r.args ?? []).filter(Boolean));
  }
  return { tables, functions };
}

// ───────────────────────── Extracción ─────────────────────────
function listFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(e.name) && !/\.test\.|\.d\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Devuelve el texto entre el paréntesis que abre en `open` y su cierre, o null. Respeta strings y plantillas. */
function balanced(src: string, open: number): { text: string; end: number } | null {
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const stack: string[] = [];
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(src, i);
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i = src.indexOf("*/", i + 2);
      if (i < 0) return null;
      i++;
      continue;
    }
    if (pairs[c]) stack.push(pairs[c]);
    else if (c === ")" || c === "]" || c === "}") {
      if (stack.pop() !== c) return null;
      if (!stack.length) return { text: src.slice(open + 1, i), end: i };
    }
  }
  return null;
}

function skipString(src: string, i: number): number {
  const q = src[i];
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === "\\") j++;
    else if (q === "`" && src[j] === "$" && src[j + 1] === "{") {
      const b = balanced(src, j + 1);
      if (!b) return src.length;
      j = b.end;
    } else if (src[j] === q) return j;
  }
  return src.length;
}

/** Claves de los objetos literales de primer nivel de un argumento (`{..}` o `[{..},{..}]`). `dynamic` si hay spread. */
export function literalKeys(arg: string): { keys: string[]; dynamic: boolean } {
  const keys: string[] = [];
  let dynamic = false;
  const a = arg.trim();
  const walk = (objText: string) => {
    // objText: contenido entre llaves de un objeto relevante
    let i = 0;
    let expectKey = true;
    while (i < objText.length) {
      const c = objText[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "/" && objText[i + 1] === "/") { while (i < objText.length && objText[i] !== "\n") i++; continue; }
      if (c === "/" && objText[i + 1] === "*") { i = objText.indexOf("*/", i + 2) + 2; continue; }
      if (expectKey) {
        if (objText.startsWith("...", i)) { dynamic = true; expectKey = false; i += 3; continue; }
        let m: RegExpExecArray | null;
        const rest = objText.slice(i);
        if ((m = /^(["'])([^"']+)\1\s*:/.exec(rest))) { keys.push(m[2]); i += m[0].length; expectKey = false; continue; }
        if ((m = /^([A-Za-z_$][\w$]*)\s*(:|,|$)/.exec(rest))) { keys.push(m[1]); i += m[1].length; expectKey = false; continue; }
        if (rest[0] === "[") { dynamic = true; expectKey = false; continue; } // clave computada
        i++;
        continue;
      }
      // saltar el valor hasta la coma de primer nivel
      if (c === '"' || c === "'" || c === "`") { i = skipString(objText, i) + 1; continue; }
      if (c === "(" || c === "[" || c === "{") {
        const b = balanced(objText, i);
        if (!b) return;
        i = b.end + 1;
        continue;
      }
      if (c === ",") { expectKey = true; i++; continue; }
      i++;
    }
  };
  if (a.startsWith("{")) {
    const b = balanced(a, 0);
    if (b) walk(b.text);
  } else if (a.startsWith("[")) {
    const b = balanced(a, 0);
    if (!b) return { keys, dynamic: true };
    let i = 0;
    const t = b.text;
    let any = false;
    while (i < t.length) {
      if (t[i] === "{") {
        const ob = balanced(t, i);
        if (!ob) break;
        walk(ob.text);
        any = true;
        i = ob.end + 1;
      } else i++;
    }
    if (!any) dynamic = true;
  } else dynamic = true; // variable
  return { keys, dynamic };
}

function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'" || c === "`") {
      const e = skipString(s, i);
      cur += s.slice(i, e + 1);
      i = e;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") depth++;
    if (c === ")" || c === "]" || c === "}") depth--;
    if (c === "," && depth === 0) { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur);
  return out;
}

/** Columnas de nivel superior de un `select("a, b:col, rel(x), *")`. */
export function selectColumns(sel: string): string[] {
  return splitTop(sel)
    .map((s) => s.trim())
    .filter((s) => s && s !== "*" && !s.includes("(") && !s.includes("!"))
    .map((s) => s.replace(/::\w+$/, "").replace(/^[\w]+:/, "").trim())
    .filter(Boolean);
}

const lineOf = (src: string, idx: number) => src.slice(0, idx).split("\n").length;

export function extractUsages(files: string[], root: string): { usages: Usage[]; skipped: number } {
  const usages: Usage[] = [];
  let skipped = 0;
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file).replace(/\\/g, "/");

    // RPC
    for (const m of src.matchAll(/\.rpc\(\s*(["'])([\w]+)\1\s*(,)?/g)) {
      usages.push({ file: rel, line: lineOf(src, m.index!), kind: "rpc", name: m[2] });
      if (m[3]) {
        const open = src.indexOf("(", m.index!);
        const b = balanced(src, open);
        if (b) {
          const after = b.text.slice(b.text.indexOf(",") + 1);
          const { keys, dynamic } = literalKeys(after);
          if (dynamic) skipped++;
          for (const k of keys) usages.push({ file: rel, line: lineOf(src, m.index!), kind: "rpc-arg", fn: m[2], name: k });
        }
      }
    }

    // Tablas
    const re = /\.from\(\s*(["'])([\w]+)\1\s*\)/g;
    const starts: { idx: number; table: string; end: number }[] = [];
    for (const m of src.matchAll(re)) {
      const before = src.slice(0, m.index!).replace(/\s+$/, "");
      const prev = /([A-Za-z_$][\w$]*)$/.exec(before)?.[1];
      if (prev && NON_DB_PREFIX.has(prev)) continue;
      starts.push({ idx: m.index!, table: m[2], end: m.index! + m[0].length });
    }
    for (let n = 0; n < starts.length; n++) {
      const { idx, table, end } = starts[n];
      usages.push({ file: rel, line: lineOf(src, idx), kind: "table", name: table });
      // cadena: hasta el final de la sentencia, sin pasar al siguiente .from()
      let stop = n + 1 < starts.length ? starts[n + 1].idx : src.length;
      // recorrer método a método para no salir de la cadena
      let pos = end;
      const colUse = (col: string, at: number) => usages.push({ file: rel, line: lineOf(src, at), kind: "column", table, name: col });
      while (pos < stop) {
        const rest = src.slice(pos, stop);
        const mm = /^\s*\??\.\s*(\w+)\s*(<[^()]*>)?\s*\(/.exec(rest);
        if (!mm) break;
        const method = mm[1];
        const open = pos + mm[0].length - 1;
        const b = balanced(src, open);
        if (!b) break;
        const arg = b.text;
        const at = pos;
        if (method === "select") {
          if (arg.trim() && !arg.includes("${")) {
            const q = /^\s*(["'`])([\s\S]*?)\1\s*(,|$)/.exec(arg);
            if (q) for (const c of selectColumns(q[2])) colUse(c, at);
            else skipped++;
          } else if (arg.includes("${")) skipped++;
        } else if (method === "insert" || method === "update" || method === "upsert") {
          const first = splitTop(arg)[0];
          const { keys, dynamic } = literalKeys(first);
          if (dynamic) skipped++;
          for (const k of keys) colUse(k, at);
        } else if (FILTER_METHODS.includes(method)) {
          if (method === "or" || method === "match" || method === "filter") {
            // or("a.eq.1,b.ilike.%x%") -> primera parte de cada condición
            if (method === "or") {
              const q = /^\s*(["'`])([\s\S]*?)\1/.exec(arg);
              if (q && !q[2].includes("${")) for (const part of splitTop(q[2])) { const c = part.trim().split(".")[0]; if (/^\w+$/.test(c)) colUse(c, at); }
              else skipped++;
            } else if (method === "filter") {
              const q = /^\s*(["'])(\w+)\1/.exec(arg);
              if (q) colUse(q[2], at);
            } else skipped++;
          } else {
            const q = /^\s*(["'])([\w]+)\1/.exec(arg);
            if (q) colUse(q[2], at);
            else skipped++;
          }
        }
        pos = b.end + 1;
      }
      stop = 0;
    }
  }
  return { usages, skipped };
}

export type Finding = { usage: Usage; message: string };

export function checkUsages(usages: Usage[], schema: Schema): Finding[] {
  const out: Finding[] = [];
  for (const u of usages) {
    if (u.kind === "table") {
      if (!schema.tables.has(u.name)) out.push({ usage: u, message: `la tabla "${u.name}" no existe` });
    } else if (u.kind === "column") {
      const cols = schema.tables.get(u.table!);
      if (cols && !cols.has(u.name)) out.push({ usage: u, message: `la columna "${u.table}.${u.name}" no existe` });
    } else if (u.kind === "rpc") {
      if (!schema.functions.has(u.name)) out.push({ usage: u, message: `la función "${u.name}" no existe` });
    } else if (u.kind === "rpc-arg") {
      const overloads = schema.functions.get(u.fn!);
      if (overloads && !overloads.some((a) => a.includes(u.name)))
        out.push({ usage: u, message: `el argumento "${u.name}" no existe en la función ${u.fn}()` });
    }
  }
  return out;
}

export async function runCheck(db: PGlite, root = path.resolve(__dirname, "..")) {
  const schema = await loadSchema(db);
  const files = [...listFiles(path.join(root, "src")), ...listFiles(path.join(root, "scripts"))].filter(
    (f) => path.resolve(f) !== path.resolve(__filename)
  );
  const { usages, skipped } = extractUsages(files, root);
  return { schema, usages, skipped, findings: checkUsages(usages, schema), files: files.length };
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  (async () => {
    const { createDb } = await import("../tests/db/harness");
    const db = await createDb();
    const r = await runCheck(db);
    const tablesUsed = new Set(r.usages.filter((u) => u.kind === "table").map((u) => u.name));
    console.log(`Archivos: ${r.files} · usos: ${r.usages.length} · tablas usadas: ${tablesUsed.size} · omitidos (dinámicos): ${r.skipped}`);
    for (const f of r.findings) console.error(`ERROR ${f.usage.file}:${f.usage.line}  ${f.message}`);
    if (r.findings.length) process.exit(1);
    console.log("OK: el código coincide con el esquema.");
    await db.close();
  })();
}
