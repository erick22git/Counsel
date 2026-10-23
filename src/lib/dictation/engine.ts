/**
 * Motor de dictado intercambiable. Hoy: Web Speech API del navegador.
 * Para cambiar a Whisper: implementar `SpeechEngine` (grabar audio con MediaRecorder y enviarlo a
 * /api/dictado/transcribir) y devolverlo en `getEngine()`. La interfaz de usuario no cambia.
 */
export interface SpeechEngine {
  readonly name: "webspeech" | "whisper";
  isSupported(): boolean;
  start(handlers: { onText: (finalText: string, interim: string) => void; onEnd: () => void; onError: (msg: string) => void }): void;
  stop(): void;
}

type SR = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

class WebSpeechEngine implements SpeechEngine {
  readonly name = "webspeech" as const;
  private rec: SR | null = null;

  private ctor(): (new () => SR) | null {
    if (typeof window === "undefined") return null;
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }

  isSupported() {
    return this.ctor() !== null;
  }

  start(h: Parameters<SpeechEngine["start"]>[0]) {
    const C = this.ctor();
    if (!C) return h.onError("Tu navegador no permite dictado. Prueba con Chrome o Edge.");
    const rec = new C();
    rec.lang = "es-BO";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      h.onText(final, interim);
    };
    rec.onerror = (e) => {
      const msg =
        e.error === "not-allowed" ? "Necesito permiso para usar el micrófono." : e.error === "no-speech" ? "No escuché nada. Intenta de nuevo." : "No se pudo dictar.";
      h.onError(msg);
    };
    rec.onend = () => h.onEnd();
    this.rec = rec;
    rec.start();
  }

  stop() {
    this.rec?.stop();
  }
}

export function getEngine(): SpeechEngine {
  return new WebSpeechEngine();
}
