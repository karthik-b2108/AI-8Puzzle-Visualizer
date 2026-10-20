import type { ReactNode } from 'react'
import styles from './IconButton.module.css'

export type IconButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'

export interface IconButtonProps {
  /** Accessible name, also the base tooltip. */
  label: string
  icon: ReactNode
  onClick?: () => void
  disabled?: boolean
  /** Present for toggle buttons; sets `aria-pressed`. */
  active?: boolean
  variant?: IconButtonVariant
  /** Display hotkey, e.g. "Space" or "←". */
  hotkey?: string
  /** Overrides the tooltip text (label is still the accessible name). */
  tooltip?: string
  type?: 'button' | 'submit'
}

const ARIA_SHORTCUTS: Record<string, string> = {
  '←': 'ArrowLeft',
  '→': 'ArrowRight',
  '↑': 'ArrowUp',
  '↓': 'ArrowDown',
  ' ': 'Space',
}

function tooltipFor(label: string, tooltip: string | undefined, hotkey: string | undefined, disabled: boolean) {
  const base = tooltip ?? label
  const withHotkey = hotkey ? `${base} (${hotkey})` : base
  return disabled ? `${withHotkey} — unavailable right now` : withHotkey
}

export default function IconButton({
  label,
  icon,
  onClick,
  disabled = false,
  active,
  variant = 'default',
  hotkey,
  tooltip,
  type = 'button',
}: IconButtonProps) {
  const isToggle = active !== undefined
  const ariaShortcut = hotkey ? (ARIA_SHORTCUTS[hotkey] ?? hotkey) : undefined

  return (
    <button
      type={type}
      className={`${styles.button} ${styles[variant]} ${active ? styles.active : ''}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isToggle ? active : undefined}
      aria-keyshortcuts={ariaShortcut}
      title={tooltipFor(label, tooltip, hotkey, disabled)}
      data-variant={variant}
      data-active={isToggle ? String(Boolean(active)) : undefined}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
    </button>
  )
}
