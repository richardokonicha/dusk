import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ error, className = "", ...props }: InputProps) {
  const inputClasses = [
    "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
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
      <input className={inputClasses} {...props} />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
