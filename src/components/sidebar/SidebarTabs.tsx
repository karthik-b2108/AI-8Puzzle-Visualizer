import { useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import type { SearchSnapshot } from '../../contract/types'
import ExploredList from './ExploredList'
import FrontierList from './FrontierList'
import styles from './SidebarTabs.module.css'

type Tab = 'frontier' | 'explored'

interface SidebarTabsProps {
  snapshot: SearchSnapshot
}

export default function SidebarTabs({ snapshot }: SidebarTabsProps) {
  const [tab, setTab] = useState<Tab>('frontier')
  const [query, setQuery] = useState('')

  const frontierCount = snapshot.stack.length
  const exploredCount = snapshot.visited.length
  const counts = useMemo(() => ({ frontier: frontierCount, explored: exploredCount }), [frontierCount, exploredCount])

  const handleTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next: Tab = tab === 'frontier' ? 'explored' : 'frontier'
    setTab(next)
    const target = document.getElementById(`sidebar-tab-${next}`)
    target?.focus()
  }

  return (
    <div className={styles.root}>
      <div className={styles.tabs} role="tablist" aria-label="Search lists" onKeyDown={handleTabKey}>
        <button
          type="button"
          role="tab"
          id="sidebar-tab-frontier"
          aria-selected={tab === 'frontier'}
          aria-controls="sidebar-panel-frontier"
          tabIndex={tab === 'frontier' ? 0 : -1}
          className={styles.tab}
          onClick={() => setTab('frontier')}
        >
          Frontier
          <span className={styles.count}>{counts.frontier}</span>
        </button>
        <button
          type="button"
          role="tab"
          id="sidebar-tab-explored"
          aria-selected={tab === 'explored'}
          aria-controls="sidebar-panel-explored"
          tabIndex={tab === 'explored' ? 0 : -1}
          className={styles.tab}
          onClick={() => setTab('explored')}
        >
          Explored
          <span className={styles.count}>{counts.explored}</span>
        </button>
      </div>

      <div className={styles.filter}>
        <Search size={14} aria-hidden="true" className={styles.filterIcon} />
        <input
          type="search"
          className={styles.input}
          placeholder="Filter by node id"
          aria-label="Filter by node id"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            className={styles.clear}
            onClick={() => setQuery('')}
            aria-label="Clear filter"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>

      <div
        className={styles.panel}
        role="tabpanel"
        id="sidebar-panel-frontier"
        aria-labelledby="sidebar-tab-frontier"
        hidden={tab !== 'frontier'}
      >
        <FrontierList snapshot={snapshot} query={query} />
      </div>
      <div
        className={styles.panel}
        role="tabpanel"
        id="sidebar-panel-explored"
        aria-labelledby="sidebar-tab-explored"
        hidden={tab !== 'explored'}
      >
        <ExploredList snapshot={snapshot} query={query} />
      </div>
    </div>
  )
}
