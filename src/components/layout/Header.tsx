import { GitBranch, PanelLeft, PanelLeftClose } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { HeaderProps } from '../../contract/ui'
import TimerChip from '../controls/TimerChip'
import IconButton from '../controls/IconButton'
import ThemeToggle from './ThemeToggle'
import styles from './Header.module.css'

/** Top bar: brand, routes, live timer, theme switch and search-list toggle. */
export default function Header({
  elapsedMs,
  running,
  theme,
  onThemeChange,
  sidebarOpen,
  onToggleSidebar,
  showSidebarToggle = true,
  showTimer = true,
}: HeaderProps) {
  const sidebarLabel = sidebarOpen ? 'Hide search list' : 'Show search list'

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <NavLink to="/" end className={styles.brand} aria-label="DFS 8-Puzzle home">
          <span className={styles.mark} aria-hidden="true">
            <GitBranch />
          </span>
          <span className={styles.wordmark}>DFS 8-Puzzle</span>
        </NavLink>

        <span className={styles.rule} aria-hidden="true" />

        <nav className={styles.nav} aria-label="Main">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}
          >
            Home
          </NavLink>
          <NavLink
            to="/visualizer"
            className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}
          >
            Visualizer
          </NavLink>
          <NavLink
            to="/learn"
            className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}
          >
            Learn
          </NavLink>
        </nav>
      </div>

      <div className={styles.right}>
        {showTimer ? <TimerChip elapsedMs={elapsedMs} running={running} /> : null}
        <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
        {showSidebarToggle ? (
          <IconButton
            label={sidebarLabel}
            tooltip={sidebarLabel}
            icon={sidebarOpen ? <PanelLeftClose /> : <PanelLeft />}
            variant="ghost"
            active={sidebarOpen}
            onClick={onToggleSidebar}
          />
        ) : null}
      </div>
    </header>
  )
}
