// Exportar a Word: documento HTML con cabecera de Office; Word lo abre como .doc.
import { escapeHtml } from "./template";

export function buildWordDoc(title: string, bodyHtml: string): string {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; }
h1 { font-size: 15pt; text-align: center; text-transform: uppercase; }
h2 { font-size: 13pt; }
p { text-align: justify; margin: 0 0 8pt; }
mark { background: #e9dcc3; }
</style></head>
<body>${bodyHtml}</body></html>`;
}

/** Nombre de archivo seguro a partir del título. */
export function safeFileName(title: string): string {
  const base = title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return base || "escrito";
}
