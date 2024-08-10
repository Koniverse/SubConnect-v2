import { fromEvent, takeUntil } from 'rxjs'
import { reset$ } from './streams'
import type { BuiltInThemes, Theme, ThemingMap } from './types'

export const themes = {
  default: {
    '--w3o-background-color': '#0C0C0C',
    '--w3o-foreground-color': '#0C0C0C',
    '--w3o-text-color': 'rgba(255, 255, 255, 0.8)',
    '--w3o-border-color': '#212121',
    '--w3o-action-color': '#252525',
    '--w3o-border-radius': '16px',
    '--w3o-font-family': 'inherit',
    '--w3o-background-color-item': '#1A1A1A'
  },
  light: {
    '--w3o-background-color': '#ffffff',
    '--w3o-foreground-color': '#EFF1FC',
    '--w3o-text-color': '#1a1d26',
    '--w3o-border-color': '#d0d4f7',
    '--w3o-action-color': '#6370E5',
    '--w3o-border-radius': '16px',
    '--w3o-font-family': 'inherit',
    '--w3o-background-color-item': 'inherit'
  },
  dark: {
    '--w3o-background-color': '#0C0C0C',
    '--w3o-foreground-color': '#0C0C0C',
    '--w3o-text-color': 'rgba(255, 255, 255, 0.8)',
    '--w3o-border-color': '#212121',
    '--w3o-action-color': '#252525',
    '--w3o-border-radius': '16px',
    '--w3o-font-family': 'inherit',
    '--w3o-background-color-item': '#1A1A1A'
  }
}

export const returnTheme = (theme: Theme): void | ThemingMap => {
  if (typeof theme === 'string' && theme === 'system') {
    return watchForSystemThemeChange()
  }
  return returnThemeMap(theme)
}

export const returnThemeMap = (theme: Theme): void | ThemingMap => {
  if (typeof theme === 'string' && theme in themes) {
    return themes[theme as BuiltInThemes]
  }
  if (typeof theme === 'object') {
    return theme
  }
}

export const handleThemeChange = (update: ThemingMap): void => {
  Object.keys(update).forEach(targetStyle => {
    document.documentElement.style.setProperty(
      targetStyle,
      update[targetStyle as keyof ThemingMap]
    )
  })
}

export const watchForSystemThemeChange = (): void => {
  const systemThemeDark = window.matchMedia('(prefers-color-scheme: dark)')
  systemThemeDark.matches
    ? handleThemeChange(themes['dark'])
    : handleThemeChange(themes['light'])

  fromEvent(systemThemeDark, 'change')
    .pipe(takeUntil(reset$))
    .subscribe((changes: Event) => {
      const themeChange = changes as MediaQueryListEvent
      themeChange.matches
        ? handleThemeChange(themes['dark'])
        : handleThemeChange(themes['light'])
    })
}
