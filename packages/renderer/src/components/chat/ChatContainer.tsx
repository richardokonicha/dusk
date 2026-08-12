import { ReactNode } from "react";

interface ChatContainerProps {
  children: ReactNode;
  className?: string;
}

export function ChatContainer({ children, className = "" }: ChatContainerProps) {
  return (
    <div
      className={`flex h-full flex-col bg-background ${className}`}
    >
      {children}
    </div>
  );
}
