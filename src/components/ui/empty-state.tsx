import * as React from "react";

/** Estado vacío = momento de marca (Lusion): figuras geométricas apagadas, una frase, una acción. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="enter mx-auto flex max-w-md flex-col items-center rounded-[28px] bg-brand px-8 py-14 text-center">
      <svg width="120" height="84" viewBox="0 0 120 84" aria-hidden className="mb-6">
        <rect x="6" y="30" width="56" height="48" rx="14" fill="var(--sky)" />
        <circle cx="76" cy="38" r="28" fill="var(--sand)" />
        <rect x="50" y="8" width="36" height="36" rx="10" fill="var(--sage)" transform="rotate(12 68 26)" />
        <path d="M58 6v10M53 11h10" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <h2 className="text-[length:var(--text-heading-sm)]">{title}</h2>
      <p className="mt-2 text-ink-2">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
