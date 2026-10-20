import { Navigate, Route, Routes } from 'react-router-dom'
import AppHeader from './components/layout/AppHeader'
import LearnPage from './routes/LearnPage'
import VisualizerPage from './routes/VisualizerPage'

function App() {
  return (
    <div className="app-shell">
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
