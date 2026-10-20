import { Layers, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { SidebarShellProps } from '../../contract/ui'
import SidebarTabs from './SidebarTabs'
import styles from './SidebarShell.module.css'

/** Collapsible, animated sidebar with the virtualized Frontier / Explored lists. */
export default function SidebarShell({ open, onToggle, snapshot }: SidebarShellProps) {
  return (
    <aside className={styles.shell} data-open={open} aria-label="Search lists">
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.icon} aria-hidden="true">
            <Layers size={15} />
          </span>
          <div className={styles.titles}>
            <h2 className={styles.title}>Search lists</h2>
            <span className={styles.summary}>
              {snapshot.stack.length} frontier · {snapshot.visited.length} explored
            </span>
          </div>
        </div>
        <button
          type="button"
          className={styles.toggle}
          onClick={onToggle}
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={open}
          aria-controls="search-lists-panel"
          title={`${open ? 'Collapse' : 'Expand'} sidebar ( [ )`}
        >
          {open ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
        </button>
      </header>

      <div className={styles.rail} aria-hidden={open}>
        <span className={styles.railLabel}>Frontier</span>
        <span className={styles.railValue}>{snapshot.stack.length}</span>
        <span className={styles.railDivider} />
        <span className={styles.railLabel}>Explored</span>
        <span className={styles.railValue}>{snapshot.visited.length}</span>
      </div>

      <div className={styles.body} id="search-lists-panel" aria-hidden={!open} data-open={open}>
        <SidebarTabs snapshot={snapshot} />
      </div>
    </aside>
  )
}
