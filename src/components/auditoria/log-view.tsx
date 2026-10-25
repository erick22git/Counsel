"use client";
import { useEffect } from "react";
import { logView } from "@/lib/auditoria/log-view-action";

/**
 * Registra "quién vio" una ficha. No pinta nada. Una vez por sesión del navegador por entidad.
 * Uso: <LogView entity="cases" id={caso.id} /> en el detalle de caso, <LogView entity="documents" id={doc.id} /> en documento.
 */
export function LogView({ entity, id }: { entity: "cases" | "documents" | "clients"; id: string }) {
  useEffect(() => {
    const key = `counsel:view:${entity}:${id}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // sin sessionStorage (modo privado): se registra igual, pero solo una vez por montaje
    }
    void logView(entity, id).catch(() => {});
  }, [entity, id]);
  return null;
}
