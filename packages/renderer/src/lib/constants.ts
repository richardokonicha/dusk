export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
} as const;

export const spacing = {
  0: "0px",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  32: "8rem",
} as const;

export const animations = {
  fadeIn: "fadeIn 200ms ease-out",
  slideUp: "slideUp 250ms ease-out",
  slideDown: "slideDown 250ms ease-out",
  scaleIn: "scaleIn 200ms ease-out",
  spin: "spin 1s linear infinite",
  pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
  fadeOut: "fadeOut 200ms ease-out",
  zoomIn: "zoomIn 200ms ease-out",
  zoomOut: "zoomOut 200ms ease-out",
  slideInFromTop: "slideInFromTop 250ms ease-out",
  slideInFromBottom: "slideInFromBottom 250ms ease-out",
  slideOutToTop: "slideOutToTop 250ms ease-out",
  slideOutToBottom: "slideOutToBottom 250ms ease-out",
} as const;

export const keyframes = {
  fadeIn: {
    from: { opacity: "0" },
    to: { opacity: "1" },
  },
  slideUp: {
    from: { transform: "translateY(10px)", opacity: "0" },
    to: { transform: "translateY(0)", opacity: "1" },
  },
  slideDown: {
    from: { transform: "translateY(-10px)", opacity: "0" },
    to: { transform: "translateY(0)", opacity: "1" },
  },
  scaleIn: {
    from: { transform: "scale(0.95)", opacity: "0" },
    to: { transform: "scale(1)", opacity: "1" },
  },
  fadeOut: {
    from: { opacity: "1" },
    to: { opacity: "0" },
  },
  zoomIn: {
    from: { transform: "scale(0.95)", opacity: "0" },
    to: { transform: "scale(1)", opacity: "1" },
  },
  zoomOut: {
    from: { transform: "scale(1)", opacity: "1" },
    to: { transform: "scale(0.95)", opacity: "0" },
  },
  slideInFromTop: {
    from: { transform: "translateY(-8px)", opacity: "0" },
    to: { transform: "translateY(0)", opacity: "1" },
  },
  slideInFromBottom: {
    from: { transform: "translateY(8px)", opacity: "0" },
    to: { transform: "translateY(0)", opacity: "1" },
  },
  slideOutToTop: {
    from: { transform: "translateY(0)", opacity: "1" },
    to: { transform: "translateY(-8px)", opacity: "0" },
  },
  slideOutToBottom: {
    from: { transform: "translateY(0)", opacity: "1" },
    to: { transform: "translateY(8px)", opacity: "0" },
  },
  slideOutToRight: {
    from: { transform: "translateX(0)", opacity: "1" },
    to: { transform: "translateX(100%)", opacity: "0" },
  },
} as const;
