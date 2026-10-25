// Regenera supabase/all-migrations.sql concatenando, en orden, TODAS las migraciones existentes.
// Uso: node scripts/build-all-migrations.mjs
// El formato lo comparte tests/db/all-migrations.test.ts (misma función `buildAllMigrations`).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "supabase", "migrations");
export const OUT = path.join(root, "supabase", "all-migrations.sql");

export function buildAllMigrations() {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  return (
    files
      .map((f) => `-- ===== supabase/migrations/${f} =====\n${fs.readFileSync(path.join(dir, f), "utf8").replace(/\r\n/g, "\n").replace(/\s+$/, "")}\n`)
      .join("\n")
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(OUT, buildAllMigrations());
  console.log(`Escrito ${path.relative(root, OUT)}`);
}
