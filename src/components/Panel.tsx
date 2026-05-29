import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Panel({ title, children, actions }: PanelProps) {
  return (
    <section className="mb-3 border border-slate-300 bg-white shadow-grid">
      <div className="flex min-h-9 items-center justify-between border-b border-slate-300 bg-slate-100 px-3">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {actions}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}
