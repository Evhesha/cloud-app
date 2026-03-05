import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth, type AuthRole } from './context/AuthContext'
import { AdminPanelScreen } from './components/screens/AdminPanelScreen'
import { AuthScreen } from './components/screens/AuthScreen'
import { CreateInstanceModalScreen } from './components/screens/CreateInstanceModalScreen'
import { CreateTenantModalScreen } from './components/screens/CreateTenantModalScreen'
import { CustomerDashboardScreen } from './components/screens/CustomerDashboardScreen'
import { EditTenantModalScreen } from './components/screens/EditTenantModalScreen'
import { InstanceManagementScreen } from './components/screens/InstanceManagementScreen'

function ProtectedRoute({ allowed }: { allowed: AuthRole[] }) {
  const { user, isAuthenticated } = useAuth()

  if (!user || !isAuthenticated) {
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
          <Routes>
            <Route path="/auth" element={<AuthScreen />} />

            <Route element={<ProtectedRoute allowed={['customer']} />}>
              <Route path="/customer-dashboard" element={<CustomerDashboardScreen />} />
              <Route path="/create-instance" element={<CreateInstanceModalScreen />} />
              <Route path="/instance-management/:instanceId" element={<InstanceManagementScreen />} />
            </Route>

            <Route element={<ProtectedRoute allowed={['admin']} />}>
              <Route path="/admin-panel" element={<AdminPanelScreen />} />
              <Route path="/create-tenant" element={<CreateTenantModalScreen />} />
              <Route path="/tenant-management/:tenantId" element={<EditTenantModalScreen />} />
            </Route>

            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
