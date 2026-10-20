import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppHeader from './components/layout/AppHeader'
import LearnPage from './routes/LearnPage'
import VisualizerPage from './routes/VisualizerPage'

function App() {
  const { pathname } = useLocation()
  const firstRender = useRef(true)

  // Move focus to the new page's main landmark after client-side navigation.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const main = document.getElementById('main-content')
    main?.focus()
  }, [pathname])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <AppHeader />
      <Routes>
        <Route path="/" element={<VisualizerPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
