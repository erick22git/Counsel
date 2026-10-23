"use client";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Abre el panel del asistente pulsando el botón "Asistente" de la barra superior (el shell es del núcleo). */
export function AskAssistant() {
  const open = () => window.dispatchEvent(new CustomEvent("counsel:open-ai"));
  return (
    <Button variant="secondary" onClick={open}>
      <Sparkles size={18} aria-hidden /> Preguntar al asistente
    </Button>
  );
}
