import { NavLink } from 'react-router-dom'
import { GitBranch } from 'lucide-react'
import styles from './AppHeader.module.css'

/** Integration shell header. The presentational header lives in ./Header.tsx. */
export default function AppHeader() {
  return (
    <header className={styles.header}>
      <NavLink to="/" className={styles.brand} aria-label="DFS 8-Puzzle Visualizer home">
        <span className={styles.mark} aria-hidden="true">
          <GitBranch size={16} strokeWidth={2.4} />
        </span>
        <span className={styles.title}>DFS 8-Puzzle</span>
      </NavLink>
      <nav className={styles.nav} aria-label="Main">
        <NavLink to="/" end className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
          Visualizer
        </NavLink>
        <NavLink to="/learn" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
          Learn
        </NavLink>
      </nav>
    </header>
  )
}
