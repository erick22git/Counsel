"use client";
import * as React from "react";
import { DEFAULT_PREFS, type Preferences } from "@/lib/db/types";
import { savePreferences } from "@/app/(app)/ajustes/actions";

const KEY = "counsel-prefs";

export function applyPrefs(p: Preferences) {
  const el = document.documentElement;
  const dark = p.theme === "oscuro" || (p.theme === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  el.dataset.theme = dark ? "dark" : "light";
  el.dataset.fontsize = p.fontSize;
  el.dataset.density = p.density;
}

/** Script inline que evita el parpadeo de tema al cargar. */
export const prefsBootScript = `(function(){try{var p=JSON.parse(localStorage.getItem('${KEY}')||'{}');var d=p.theme==='oscuro'||((p.theme||'sistema')==='sistema'&&matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.dataset.theme=d?'dark':'light';e.dataset.fontsize=p.fontSize||'normal';e.dataset.density=p.density||'comoda';}catch(e){}})();`;

type Ctx = { prefs: Preferences; setPref: <K extends keyof Preferences>(k: K, v: Preferences[K]) => void };
const PrefsContext = React.createContext<Ctx>({ prefs: DEFAULT_PREFS, setPref: () => {} });
export const usePrefs = () => React.useContext(PrefsContext);

export function PrefsProvider({ initial, children }: { initial?: Preferences; children: React.ReactNode }) {
  const [prefs, setPrefs] = React.useState<Preferences>({ ...DEFAULT_PREFS, ...initial });

  React.useEffect(() => {
    applyPrefs(prefs);
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {}
    if (prefs.theme !== "sistema") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyPrefs(prefs);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [prefs]);

  const setPref: Ctx["setPref"] = (k, v) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    void savePreferences(next); // guardado por usuario en el servidor
  };

  return <PrefsContext.Provider value={{ prefs, setPref }}>{children}</PrefsContext.Provider>;
}
