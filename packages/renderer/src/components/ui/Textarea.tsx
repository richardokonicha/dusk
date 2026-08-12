import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function Textarea({ error, className = "", ...props }: TextareaProps) {
  const textareaClasses = [
    "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    error ? "border-destructive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="w-full">
      <textarea className={textareaClasses} {...props} />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
