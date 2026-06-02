export type ColorScale = {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  800: string
  900: string
}

export type Colors = {
  primary: ColorScale
  secondary: ColorScale
  success: ColorScale
  warning: ColorScale
  error: ColorScale
  gray: ColorScale
}

export const colors: Colors = {
  primary: {
    50: 'hsl(221.2 100% 97%)',
    100: 'hsl(221.2 100% 94%)',
    200: 'hsl(221.2 100% 88%)',
    300: 'hsl(221.2 100% 81%)',
    400: 'hsl(221.2 93% 68%)',
    500: 'hsl(221.2 83.2% 53.3%)',
    600: 'hsl(221.2 83% 47%)',
    700: 'hsl(221.2 83% 40%)',
    800: 'hsl(221.2 83% 33%)',
    900: 'hsl(221.2 83% 26%)',
  },
  secondary: {
    50: 'hsl(210 40% 98%)',
    100: 'hsl(210 40% 96%)',
    200: 'hsl(210 40% 92%)',
    300: 'hsl(210 40% 84%)',
    400: 'hsl(210 40% 66%)',
    500: 'hsl(210 40% 50%)',
    600: 'hsl(210 40% 40%)',
    700: 'hsl(210 40% 30%)',
    800: 'hsl(210 40% 20%)',
    900: 'hsl(210 40% 12%)',
  },
  success: {
    50: 'hsl(142.1 76% 97%)',
    100: 'hsl(142.1 76% 94%)',
    200: 'hsl(142.1 76% 85%)',
    300: 'hsl(142.1 76% 73%)',
    400: 'hsl(142.1 70% 55%)',
    500: 'hsl(142.1 71% 45%)',
    600: 'hsl(142.1 76% 36%)',
    700: 'hsl(142.1 76% 28%)',
    800: 'hsl(142.1 76% 20%)',
    900: 'hsl(142.1 76% 12%)',
  },
  warning: {
    50: 'hsl(38 100% 97%)',
    100: 'hsl(38 100% 94%)',
    200: 'hsl(38 100% 88%)',
    300: 'hsl(38 100% 81%)',
    400: 'hsl(38 92% 58%)',
    500: 'hsl(38 92% 50%)',
    600: 'hsl(38 92% 42%)',
    700: 'hsl(38 92% 34%)',
    800: 'hsl(38 92% 26%)',
    900: 'hsl(38 92% 18%)',
  },
  error: {
    50: 'hsl(0 86% 97%)',
    100: 'hsl(0 86% 94%)',
    200: 'hsl(0 86% 88%)',
    300: 'hsl(0 86% 81%)',
    400: 'hsl(0 84% 67%)',
    500: 'hsl(0 84% 60%)',
    600: 'hsl(0 72% 51%)',
    700: 'hsl(0 72% 42%)',
    800: 'hsl(0 72% 34%)',
    900: 'hsl(0 72% 26%)',
  },
  gray: {
    50: 'hsl(210 40% 98%)',
    100: 'hsl(214 32% 96%)',
    200: 'hsl(213 27% 92%)',
    300: 'hsl(213 27% 84%)',
    400: 'hsl(215 20% 65%)',
    500: 'hsl(215 16% 47%)',
    600: 'hsl(215 19% 35%)',
    700: 'hsl(217 23% 26%)',
    800: 'hsl(217 24% 18%)',
    900: 'hsl(220 25% 10%)',
  },
} as const

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
} as const

export const typography = {
  fontFamily: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const

export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const

export const transitions = {
  fast: '150ms ease',
  DEFAULT: '200ms ease',
  slow: '300ms ease',
} as const

export const zIndices = {
  dropdown: 50,
  sticky: 100,
  modal: 200,
  popover: 300,
  tooltip: 400,
  toast: 500,
} as const
