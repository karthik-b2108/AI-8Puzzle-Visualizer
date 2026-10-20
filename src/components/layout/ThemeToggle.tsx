import { Moon, Sun } from 'lucide-react'
import type { Theme } from '../../contract/ui'
import IconButton from '../controls/IconButton'

export interface ThemeToggleProps {
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

/** Light/dark switch. Purely presentational: the integration track owns state. */
export default function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? 'Switch to dark theme' : 'Switch to light theme'

  return (
    <IconButton
      label={label}
      tooltip={label}
      variant="ghost"
      icon={theme === 'dark' ? <Sun /> : <Moon />}
      onClick={() => onThemeChange(next)}
    />
  )
}
