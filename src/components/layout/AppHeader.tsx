import { useLocation } from 'react-router-dom'
import Header from './Header'
import { useSearchStore } from '../../store/useSearchStore'
import { useSettingsStore } from '../../store/useSettingsStore'

/** Connects the presentational header to the live search and UI settings. */
export default function AppHeader() {
  const { pathname } = useLocation()
  const elapsedMs = useSearchStore((state) => state.snapshot.metrics.elapsedMs)
  const running = useSearchStore((state) => state.autoplay.running)
  const theme = useSettingsStore((state) => state.theme)
  const setTheme = useSettingsStore((state) => state.setTheme)
  const sidebarOpen = useSettingsStore((state) => state.sidebarOpen)
  const toggleSidebar = useSettingsStore((state) => state.toggleSidebar)

  return (
    <Header
      elapsedMs={elapsedMs}
      running={running}
      theme={theme}
      onThemeChange={setTheme}
      sidebarOpen={sidebarOpen}
      onToggleSidebar={toggleSidebar}
      showSidebarToggle={pathname === '/'}
    />
  )
}
