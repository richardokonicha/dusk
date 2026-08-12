import React from "react";

export interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

export function Avatar({ fallback, className = "", alt = "", src, "data-testid": testId, ...props }: AvatarProps & { "data-testid"?: string }) {
  const initials = fallback
    ? fallback
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} data-testid={testId}>
      {src ? (
        <img
          className="aspect-square h-full w-full object-cover"
          alt={alt || fallback || "Avatar"}
          src={src}
          {...props}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
          {initials}
        </div>
      )}
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
