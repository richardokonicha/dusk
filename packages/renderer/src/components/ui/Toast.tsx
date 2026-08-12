import React, { useState, useCallback } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  title?: string;
  description?: string;
  action?: ToastAction;
  duration?: number;
}

export function ToastProvider({ children, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Provider>) {
  return <ToastPrimitive.Provider swipeDirection="right" {...props}>{children}</ToastPrimitive.Provider>;
}

export function ToastViewport({ className = "", ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
        className
      )}
      {...props}
    />
  );
}

export function Toast({ className = "", children, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>) {
  return (
    <ToastPrimitive.Root
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border border-border bg-background p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full",
        className
      )}
      {...props}
    >
      {children}
    </ToastPrimitive.Root>
  );
}

export function ToastClose({ className = "", ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      className={cn(
        "absolute right-2 top-2 rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
      {...props}
    >
      <X className="h-4 w-4" />
    </ToastPrimitive.Close>
  );
}

export function ToastTitle({ className = "", ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>) {
  return <ToastPrimitive.Title className={cn("text-sm font-semibold", className)} {...props} />;
}

export function ToastDescription({ className = "", ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>) {
  return <ToastPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function ToastAction({ className = "", altText = "", children, ...props }: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action> & { altText?: string }) {
  return (
    <ToastPrimitive.Action
      altText={altText}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {altText && <span className="sr-only">{altText}</span>}
    </ToastPrimitive.Action>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; options: ToastOptions }>>([]);

  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, options }]);
    if (options.duration !== 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, options.duration ?? 5000);
    }
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toast, toasts, dismiss };
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
