import { ReactNode } from "react";

interface PanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, children, className = "" }: PanelProps) {
  return (
    <div className={`flex h-full flex-col ${className}`}>
      {title && (
        <div className="shrink-0 border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}
