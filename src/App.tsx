import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { CloudProvider } from './context/CloudContext'
import { AuthProvider, useAuth, type AuthRole } from './context/AuthContext'
import { AdminPanelScreen } from './components/screens/AdminPanelScreen'
import { AuthScreen } from './components/screens/AuthScreen'
import { CreateInstanceModalScreen } from './components/screens/CreateInstanceModalScreen'
import { CreateTenantModalScreen } from './components/screens/CreateTenantModalScreen'
import { CustomerDashboardScreen } from './components/screens/CustomerDashboardScreen'

function ProtectedRoute({ allowed }: { allowed: AuthRole[] }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  if (!allowed.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin-panel' : '/customer-dashboard'} replace />
  }

  return <Outlet />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CloudProvider>
          <Routes>
            <Route path="/auth" element={<AuthScreen />} />

            <Route element={<ProtectedRoute allowed={['customer']} />}>
              <Route path="/customer-dashboard" element={<CustomerDashboardScreen />} />
              <Route path="/create-instance" element={<CreateInstanceModalScreen />} />
            </Route>

            <Route element={<ProtectedRoute allowed={['admin']} />}>
              <Route path="/admin-panel" element={<AdminPanelScreen />} />
              <Route path="/create-tenant" element={<CreateTenantModalScreen />} />
              <Route path="/tenant-management/:tenantId" element={<CreateTenantModalScreen />} />
            </Route>

            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </CloudProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
