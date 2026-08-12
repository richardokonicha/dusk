import React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

export interface SwitchProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  thumbClassName?: string;
}

export function Switch({ className = "", thumbClassName, checked, ...props }: SwitchProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full bg-background text-primary transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
          thumbClassName
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
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
