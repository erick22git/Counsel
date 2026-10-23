import { describe, it, expect } from "vitest";
import { renderTemplate, extractVariables, escapeHtml, autofillValues, mergeValues, formatDateLong, countUnfilled } from "@/lib/editor/template";
import { buildWordDoc, safeFileName } from "@/lib/editor/export";

describe("extractVariables", () => {
  it("devuelve claves únicas en orden", () => {
    expect(extractVariables("<p>{{a}} y {{ b }} y {{a}} {{c_1}}</p>")).toEqual(["a", "b", "c_1"]);
  });
  it("sin variables", () => expect(extractVariables("<p>hola</p>")).toEqual([]));
});

describe("renderTemplate", () => {
  it("reemplaza valores", () => {
    expect(renderTemplate("<p>{{x}} / {{x}}</p>", { x: "Ana" })).toBe("<p>Ana / Ana</p>");
  });
  it("marca las faltantes con la etiqueta", () => {
    const out = renderTemplate("<p>{{x}}</p>", {}, [{ key: "x", label: "Nombre" }]);
    expect(out).toBe('<p><mark class="var">[Nombre]</mark></p>');
    expect(countUnfilled(out)).toBe(1);
  });
  it("trata vacío/espacios como faltante", () => {
    expect(renderTemplate("{{x}}", { x: "   " })).toContain('class="var"');
  });
  it("escapa HTML en los valores (anti-XSS)", () => {
    const out = renderTemplate("<p>{{x}}</p>", { x: '<script>alert("x")</script><img src=x onerror=1>' });
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
  });
  it("escapa también la etiqueta de la marca", () => {
    const out = renderTemplate("{{x}}", {}, [{ key: "x", label: "<b>x</b>" }]);
    expect(out).not.toContain("<b>");
  });
  it("no re-interpreta {{}} dentro de un valor", () => {
    expect(renderTemplate("{{a}}", { a: "{{b}}", b: "zzz" })).toBe("{{b}}");
  });
  it("formatea fechas y respeta saltos en campos largos", () => {
    const vars = [{ key: "f", label: "Fecha", type: "fecha" as const }, { key: "h", label: "Hechos", type: "largo" as const }];
    expect(renderTemplate("{{f}}", { f: "2026-10-23" }, vars)).toBe("23 de octubre de 2026");
    expect(renderTemplate("{{h}}", { h: "uno\ndos <b>" }, vars)).toBe("uno<br>dos &lt;b&gt;");
  });
});

describe("escapeHtml / fechas", () => {
  it("escapa los 5 caracteres", () => expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;"));
  it("formatDateLong deja pasar lo que no es ISO", () => {
    expect(formatDateLong("mañana")).toBe("mañana");
    expect(formatDateLong("2026-13-01")).toBe("2026-13-01");
  });
});

describe("autofill", () => {
  it("llena con cliente y caso, ciudad por defecto La Paz", () => {
    const v = autofillValues({
      client: { full_name: "Cliente Ficticio", ci_nit: "1234567", address: "Calle Falsa 1" },
      case: { case_number: "123/2026", court: "Juzgado Demo" },
      now: new Date("2026-10-23T15:00:00Z"),
    });
    expect(v).toMatchObject({ cliente_nombre: "Cliente Ficticio", cliente_ci: "1234567", caso_numero: "123/2026", juzgado: "Juzgado Demo", ciudad: "La Paz", fecha: "2026-10-23" });
    expect(v.cliente_telefono).toBeUndefined();
  });
  it("lo escrito manda sobre el autollenado", () => {
    expect(mergeValues({ ciudad: "La Paz", a: "1" }, { ciudad: "Sucre", a: "  " })).toEqual({ ciudad: "Sucre", a: "1" });
  });
});

describe("export Word", () => {
  it("envuelve el HTML y escapa el título", () => {
    const d = buildWordDoc("<x>", "<p>hola</p>");
    expect(d).toContain("<p>hola</p>");
    expect(d).toContain("&lt;x&gt;");
  });
  it("nombre de archivo seguro", () => expect(safeFileName("Poder: Ñandú / 2026")).toBe("Poder-Nandu-2026"));
});
