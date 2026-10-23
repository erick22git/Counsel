"use client";
import * as React from "react";
import { Textarea } from "@/components/ui/field";
import { DictationButton } from "@/components/dictation/dictation-button";

/** Textarea controlado con botón de dictado debajo. Úsalo en cualquier campo de texto largo. */
export function TextWithDictation({
  value,
  onChange,
  ...rest
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      <div>
        <DictationButton onText={(t) => onChange((value ? value + (value.endsWith(" ") ? "" : " ") : "") + t)} />
      </div>
    </div>
  );
}
