"use client";
import { toast } from "sonner";

/** Confirmación + "Deshacer" durante 8 s para acciones importantes. */
export function toastWithUndo(message: string, onUndo: () => void | Promise<void>) {
  toast(message, {
    duration: 8000,
    action: { label: "Deshacer", onClick: () => void onUndo() },
  });
}

export const ok = (m: string) => toast.success(m);
export const fail = (m: string) => toast.error(m);
