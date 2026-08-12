import React, { useRef, useState } from "react";

export interface SliderProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function Slider({
  value = [0],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className = "",
  ...props
}: SliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsDragging(true);
    updateValue(e);
    const target = e.target as HTMLElement;
    if (typeof target.setPointerCapture === "function") {
      target.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateValue(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    const target = e.target as HTMLElement;
    if (typeof target.releasePointerCapture === "function") {
      target.releasePointerCapture(e.pointerId);
    }
  };

  const updateValue = (e: React.PointerEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const rawValue = min + percentage * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    const clampedValue = Math.min(max, Math.max(min, steppedValue));
    onValueChange?.([clampedValue]);
  };

  const percentage = ((value[0] - min) / (max - min)) * 100;

  return (
    <div
      ref={sliderRef}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value[0]}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div
        className={cn(
          "block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragging && "cursor-grabbing"
        )}
        style={{ position: "absolute", left: `calc(${percentage}% - 10px)` }}
      />
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
