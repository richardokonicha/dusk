import React from "react";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal" | "both";
}

export function ScrollArea({
  orientation = "vertical",
  className = "",
  children,
  ...props
}: ScrollAreaProps) {
  const scrollClasses = {
    vertical: "overflow-y-auto",
    horizontal: "overflow-x-auto",
    both: "overflow-auto",
  };

  return (
    <div
      className={cn("relative", scrollClasses[orientation], className)}
      {...props}
    >
      {children}
    </div>
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
