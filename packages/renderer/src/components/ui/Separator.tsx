import React from "react";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

export function Separator({
  orientation = "horizontal",
  decorative = true,
  className = "",
  ...props
}: SeparatorProps) {
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  );
}

function cn(...classes: (string | boolean | undefined | null | Record<string, boolean>)[]) {
  const result: string[] = [];
  for (const cls of classes) {
    if (typeof cls === "string") {
      result.push(cls);
    } else if (typeof cls === "object" && cls !== null) {
      for (const [key, value] of Object.entries(cls)) {
        if (value) result.push(key);
      }
    }
  }
  return result.join(" ");
}
