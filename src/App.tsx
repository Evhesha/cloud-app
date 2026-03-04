import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminPanelScreen } from './components/screens/AdminPanelScreen'
import { AuthScreen } from './components/screens/AuthScreen'
import { CreateInstanceModalScreen } from './components/screens/CreateInstanceModalScreen'
import { CustomerDashboardScreen } from './components/screens/CustomerDashboardScreen'

function AppContent() {
  return (
    <div className="app-shell">
      <main className="preview-area">
        <Routes>
          <Route path="/auth" element={<AuthScreen />} />
          <Route path="/customer-dashboard" element={<CustomerDashboardScreen />} />
          <Route path="/admin-panel" element={<AdminPanelScreen />} />
          <Route path="/create-instance" element={<CreateInstanceModalScreen />} />
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
