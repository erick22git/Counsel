"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { setTaskDone } from "@/app/(app)/panel/actions";
import { toastWithUndo, fail } from "@/components/ui/undo-toast";

/** Casilla grande (44 px) para marcar una tarea como hecha, con Deshacer. */
export function TaskRow({ id, title, caseTitle, when, overdue }: { id: string; title: string; caseTitle?: string | null; when: string; overdue?: boolean }) {
  const router = useRouter();
  const [done, setDone] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const change = (next: boolean) => {
    setDone(next);
    startTransition(async () => {
      const r = await setTaskDone({ id, done: next });
      if (!r.ok) {
        setDone(!next);
        fail(r.error);
        return;
      }
      if (next) toastWithUndo("Tarea hecha", () => change(false));
      router.refresh();
    });
  };

  return (
    <li>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
        <input
          type="checkbox"
          checked={done}
          disabled={pending}
          onChange={(e) => change(e.target.checked)}
          className="size-6 shrink-0 cursor-pointer accent-[var(--accent)]"
        />
        <span className="min-w-0 flex-1">
          <span className={done ? "block text-ink-3 line-through" : "block"}>{title}</span>
          {caseTitle && <span className="block truncate text-[length:var(--text-body-sm)] text-ink-2">{caseTitle}</span>}
        </span>
        <span className={`shrink-0 text-[length:var(--text-body-sm)] ${overdue ? "text-danger" : "text-ink-2"}`}>{when}</span>
      </label>
    </li>
  );
}
