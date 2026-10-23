"use client";
import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fade-in fixed inset-0 z-50 bg-black/40" />
      <D.Content
        className={cn(
          "enter fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[0_6px_10px_rgba(0,0,0,.04),0_2px_4px_rgba(0,0,0,.04)]",
          className
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <D.Title className="text-[length:var(--text-heading-sm)] font-semibold">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-ink-2">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close aria-label="Cerrar" className="press -mr-2 -mt-2 grid size-11 place-items-center rounded-lg hover:bg-surface-2">
            <X size={22} aria-hidden />
          </D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}
