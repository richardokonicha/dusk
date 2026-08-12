import { useEffect, useState } from "react";

type MediaQueryOptions = {
  defaultValue?: boolean;
};

export function useMediaQuery(query: string, options?: MediaQueryOptions): boolean {
  const { defaultValue = false } = options || {};

  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return defaultValue;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    setMatches(mediaQuery.matches);

    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function usePrefersDark(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

export function usePrefersHighContrast(): boolean {
  return useMediaQuery("(prefers-contrast: more)");
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 640px)");
}

export function useIsTablet(): boolean {
  return useMediaQuery("(min-width: 641px) and (max-width: 1024px)");
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1025px)");
}
