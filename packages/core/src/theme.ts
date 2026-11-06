/** 与 PHP ThemeColor / ColorMode 对齐的导航栏色表。 */
export const NAVBAR_COLORS: Record<string, string> = {
  primary: '#007bff',
  secondary: '#6c757d',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  navy: '#001f3f',
  olive: '#3d9970',
  lime: '#01ff70',
  fuchsia: '#f012be',
  maroon: '#d81b60',
  indigo: '#6610f2',
  purple: '#6f42c1',
  pink: '#e83e8c',
  orange: '#fd7e14',
  teal: '#20c997',
  cyan: '#17a2b8',
  gray: '#6c757d',
  light: '#f8f9fa',
  white: '#ffffff',
  dark: '#343a40',
}

const LIGHT_NAVBARS = new Set(['light', 'warning', 'white', 'orange'])

export function navbarColor(name: string | undefined): string {
  return NAVBAR_COLORS[name ?? 'primary'] ?? NAVBAR_COLORS.primary!
}

/** 等价 PHP ColorMode：light 导航栏需要深色文字。 */
export function navbarColorMode(name: string | undefined): 'light' | 'dark' {
  return LIGHT_NAVBARS.has(name ?? '') ? 'light' : 'dark'
}

export interface ThemeTokens {
  primaryColor: string
  navbarColor: string
  navbarMode: 'light' | 'dark'
  dark: boolean
}

export function themeTokens(options: {
  navbarColor?: string
  darkMode?: boolean
}): ThemeTokens {
  return {
    primaryColor: navbarColor(options.navbarColor),
    navbarColor: navbarColor(options.navbarColor),
    navbarMode: navbarColorMode(options.navbarColor),
    dark: options.darkMode === true,
  }
}
