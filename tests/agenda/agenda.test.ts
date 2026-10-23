import { describe, it, expect } from "vitest";
import {
  dayKey, timeKey, todayKey, addDays, diffDays, startOfWeek, endOfWeek, laPazToIso, monthGrid, shiftMonth,
  fmtDayLong, fmtTimeRange, fmtDayRelative, fmtTaskDue, fmtMonthTitle,
} from "@/lib/agenda/dates";
import { groupAppointments, isDeadlineSoon, classifyTask, groupTasks, bucketOfDay, indexByDay } from "@/lib/agenda/group";

// 2026-10-23 es viernes.
const NOW = new Date("2026-10-23T15:00:00Z"); // 11:00 en La Paz

describe("zona horaria America/La_Paz (UTC-4)", () => {
  it("00:30 UTC todavía es el día anterior en La Paz", () => {
    expect(dayKey("2026-10-23T00:30:00Z")).toBe("2026-10-22");
    expect(timeKey("2026-10-23T00:30:00Z")).toBe("20:30");
  });
  it("03:59 UTC es el día anterior y 04:00 UTC ya es el día nuevo", () => {
    expect(dayKey("2026-10-23T03:59:00Z")).toBe("2026-10-22");
    expect(dayKey("2026-10-23T04:00:00Z")).toBe("2026-10-23");
  });
  it("sin horario de verano: mismo desfase en enero y en julio", () => {
    expect(timeKey("2026-01-15T14:00:00Z")).toBe("10:00");
    expect(timeKey("2026-07-15T14:00:00Z")).toBe("10:00");
  });
  it("laPazToIso convierte hora local a UTC y vuelve", () => {
    const iso = laPazToIso("2026-10-23", "21:30");
    expect(iso).toBe("2026-10-24T01:30:00.000Z");
    expect(dayKey(iso)).toBe("2026-10-23");
    expect(timeKey(iso)).toBe("21:30");
  });
  it("todayKey usa la hora de La Paz", () => {
    expect(todayKey(new Date("2026-10-24T02:00:00Z"))).toBe("2026-10-23");
  });
});

describe("aritmética de días", () => {
  it("addDays cruza mes y año", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
  it("diffDays", () => {
    expect(diffDays("2026-10-23", "2026-10-26")).toBe(3);
    expect(diffDays("2026-10-23", "2026-10-20")).toBe(-3);
  });
  it("semana empieza en lunes", () => {
    expect(startOfWeek("2026-10-23")).toBe("2026-10-19");
    expect(endOfWeek("2026-10-23")).toBe("2026-10-25");
    expect(startOfWeek("2026-10-25")).toBe("2026-10-19"); // domingo
    expect(startOfWeek("2026-10-19")).toBe("2026-10-19"); // lunes
  });
});

describe("cuadrícula del mes", () => {
  it("octubre 2026: 5 semanas, empieza lunes 28 sep", () => {
    const g = monthGrid(2026, 10);
    expect(g).toHaveLength(5);
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(g[0][0]).toEqual({ key: "2026-09-28", day: 28, inMonth: false });
    expect(g[0][3]).toEqual({ key: "2026-10-01", day: 1, inMonth: true });
    expect(g[4][6].key).toBe("2026-11-01");
  });
  it("febrero 2027 (empieza lunes) cabe en 4 semanas", () => {
    const g = monthGrid(2027, 2);
    expect(g).toHaveLength(4);
    expect(g[0][0].key).toBe("2027-02-01");
    expect(g[3][6].key).toBe("2027-02-28");
  });
  it("diciembre cruza al año siguiente", () => {
    const g = monthGrid(2026, 12);
    expect(g.flat().filter((c) => c.inMonth)).toHaveLength(31);
    expect(g.at(-1)!.at(-1)!.key).toBe("2027-01-03");
  });
  it("shiftMonth", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 5, 0)).toEqual({ year: 2026, month: 5 });
  });
});

describe("agrupar citas por día", () => {
  const mk = (id: string, iso: string) => ({ id, starts_at: iso });
  const items = [
    mk("pasada", "2026-10-20T14:00:00Z"),
    mk("hoy-tarde", "2026-10-23T20:00:00Z"),
    mk("hoy-temprano", "2026-10-23T12:00:00Z"),
    mk("noche-limite", "2026-10-24T03:00:00Z"), // 23:00 del viernes en La Paz => hoy
    mk("manana", "2026-10-24T14:00:00Z"),
    mk("domingo", "2026-10-25T14:00:00Z"),
    mk("lunes-sig", "2026-10-26T14:00:00Z"),
  ];
  const g = groupAppointments(items, NOW);
  it("separa en bloques", () => {
    expect(g.hoy.map((d) => d.key)).toEqual(["2026-10-23"]);
    expect(g.manana.map((d) => d.key)).toEqual(["2026-10-24"]);
    expect(g.semana.map((d) => d.key)).toEqual(["2026-10-25"]);
    expect(g.despues.map((d) => d.key)).toEqual(["2026-10-26"]);
    expect(g.pasadas.map((d) => d.key)).toEqual(["2026-10-20"]);
  });
  it("ordena por hora dentro del día y respeta La Paz", () => {
    expect(g.hoy[0].items.map((i) => i.id)).toEqual(["hoy-temprano", "hoy-tarde", "noche-limite"]);
  });
  it("pasadas: más reciente primero", () => {
    const p = groupAppointments([mk("a", "2026-10-01T14:00:00Z"), mk("b", "2026-10-10T14:00:00Z")], NOW);
    expect(p.pasadas.map((d) => d.key)).toEqual(["2026-10-10", "2026-10-01"]);
  });
  it("bucketOfDay cuando hoy es domingo: no hay 'esta semana'", () => {
    const dom = new Date("2026-10-25T15:00:00Z");
    expect(bucketOfDay("2026-10-26", dom)).toBe("manana");
    expect(bucketOfDay("2026-10-27", dom)).toBe("despues");
  });
  it("indexByDay agrupa por día local", () => {
    const m = indexByDay(items);
    expect(m.get("2026-10-23")).toHaveLength(3);
  });
});

describe("plazo próximo (<= 3 días)", () => {
  const p = (iso: string, extra = {}) => ({ kind: "plazo", starts_at: iso, status: "programada", ...extra });
  it("hoy y a 3 días resaltan; a 4 días no", () => {
    expect(isDeadlineSoon(p("2026-10-23T14:00:00Z"), NOW)).toBe(true);
    expect(isDeadlineSoon(p("2026-10-26T14:00:00Z"), NOW)).toBe(true);
    expect(isDeadlineSoon(p("2026-10-27T14:00:00Z"), NOW)).toBe(false);
  });
  it("un plazo pasado, realizado o una audiencia no resaltan", () => {
    expect(isDeadlineSoon(p("2026-10-22T14:00:00Z"), NOW)).toBe(false);
    expect(isDeadlineSoon(p("2026-10-24T14:00:00Z", { status: "realizada" }), NOW)).toBe(false);
    expect(isDeadlineSoon(p("2026-10-24T14:00:00Z", { kind: "audiencia" }), NOW)).toBe(false);
  });
  it("usa el día de La Paz, no el de UTC", () => {
    // 01:00 UTC del 27 = 21:00 del 26 en La Paz => 3 días
    expect(isDeadlineSoon(p("2026-10-27T01:00:00Z"), NOW)).toBe(true);
  });
});

describe("tareas", () => {
  const t = (due: string | null, done: string | null = null, created = "2026-10-01T00:00:00Z") => ({ due_at: due, done_at: done, created_at: created });
  it("clasifica", () => {
    expect(classifyTask(t("2026-10-22"), NOW)).toBe("vencidas");
    expect(classifyTask(t("2026-10-23"), NOW)).toBe("hoy");
    expect(classifyTask(t("2026-10-25"), NOW)).toBe("semana");
    expect(classifyTask(t("2026-10-26"), NOW)).toBe("mas_tarde");
    expect(classifyTask(t(null), NOW)).toBe("sin_fecha");
    expect(classifyTask(t("2026-10-01", "2026-10-22T10:00:00Z"), NOW)).toBe("hechas");
  });
  it("usa el día de La Paz para 'hoy' (madrugada UTC)", () => {
    const tarde = new Date("2026-10-24T02:00:00Z"); // aún viernes 23 en La Paz
    expect(classifyTask(t("2026-10-23"), tarde)).toBe("hoy");
    expect(classifyTask(t("2026-10-23"), new Date("2026-10-24T04:00:00Z"))).toBe("vencidas");
  });
  it("agrupa y ordena", () => {
    const g = groupTasks([t("2026-10-21"), t("2026-10-20"), t(null), t("2026-10-23")], NOW);
    expect(g.vencidas.map((x) => x.due_at)).toEqual(["2026-10-20", "2026-10-21"]);
    expect(g.hoy).toHaveLength(1);
    expect(g.sin_fecha).toHaveLength(1);
  });
});

describe("formato", () => {
  it("fmtDayLong", () => {
    expect(fmtDayLong("2026-10-23", NOW)).toBe("viernes 23 de octubre");
    expect(fmtDayLong("2027-01-04", NOW)).toBe("lunes 4 de enero de 2027");
  });
  it("fmtDayRelative", () => {
    expect(fmtDayRelative("2026-10-23", NOW)).toBe("Hoy");
    expect(fmtDayRelative("2026-10-24", NOW)).toBe("Mañana");
    expect(fmtDayRelative("2026-10-22", NOW)).toBe("Ayer");
  });
  it("fmtTimeRange", () => {
    expect(fmtTimeRange("2026-10-23T13:00:00Z", "2026-10-23T14:30:00Z")).toBe("09:00 a 10:30");
    expect(fmtTimeRange("2026-10-23T13:00:00Z", null)).toBe("09:00");
  });
  it("fmtTaskDue", () => {
    expect(fmtTaskDue(null, NOW)).toBe("Sin fecha");
    expect(fmtTaskDue("2026-10-23", NOW)).toBe("Vence hoy");
    expect(fmtTaskDue("2026-10-20", NOW)).toBe("Venció hace 3 días");
  });
  it("fmtMonthTitle", () => {
    expect(fmtMonthTitle(2026, 10)).toBe("Octubre 2026");
  });
});
