"use client";
import * as React from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { getEngine, type SpeechEngine } from "@/lib/dictation/engine";
import { cn } from "@/lib/utils";

/**
 * Botón de dictado para campos de texto. Con texto visible ("Dictar"/"Detener").
 * `onText` recibe el texto final reconocido para agregarlo al campo.
 */
export function DictationButton({ onText, className }: { onText: (text: string) => void; className?: string }) {
  const [listening, setListening] = React.useState(false);
  const [interim, setInterim] = React.useState("");
  const engine = React.useRef<SpeechEngine | null>(null);
  const [supported, setSupported] = React.useState(true);

  React.useEffect(() => {
    engine.current = getEngine();
    setSupported(engine.current.isSupported());
    return () => engine.current?.stop();
  }, []);

  if (!supported) return null;

  const toggle = () => {
    const e = engine.current!;
    if (listening) return e.stop();
    setListening(true);
    e.start({
      onText: (final, im) => {
        if (final) onText(final.trim() + " ");
        setInterim(im);
      },
      onEnd: () => {
        setListening(false);
        setInterim("");
      },
      onError: (m) => {
        toast.error(m);
        setListening(false);
      },
    });
  };

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        className={cn(
          "press inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[length:var(--text-body-sm)] font-medium",
          listening ? "border-danger bg-danger-soft text-danger" : "border-line-strong bg-surface text-ink hover:bg-surface-2"
        )}
      >
        {listening ? <Square size={16} aria-hidden /> : <Mic size={18} aria-hidden />}
        {listening ? "Detener" : "Dictar"}
      </button>
      {listening && (
        <span role="status" className="text-[length:var(--text-body-sm)] text-ink-2">
          {interim || "Te escucho…"}
        </span>
      )}
    </span>
  );
}
