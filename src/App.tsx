import { useMemo, useState } from 'react'
import { AdminPanelScreen } from './components/screens/AdminPanelScreen'
import { AuthScreen } from './components/screens/AuthScreen'
import { CreateInstanceModalScreen } from './components/screens/CreateInstanceModalScreen'
import { CustomerDashboardScreen } from './components/screens/CustomerDashboardScreen'

type ScreenKey = 'auth' | 'customer' | 'admin' | 'modal'

type ScreenOption = {
  key: ScreenKey
  label: string
}

const options: ScreenOption[] = [
  { key: 'auth', label: 'Auth Screen' },
  { key: 'customer', label: 'Customer Dashboard' },
  { key: 'admin', label: 'Infrastructure Admin' },
  { key: 'modal', label: 'Create Instance Modal' },
]

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('auth')

  const content = useMemo(() => {
    switch (activeScreen) {
      case 'customer':
        return <CustomerDashboardScreen />
      case 'admin':
        return <AdminPanelScreen />
      case 'modal':
        return <CreateInstanceModalScreen />
      case 'auth':
      default:
        return <AuthScreen />
    }
  }, [activeScreen])

  return (
    <div className="app-shell">
      <aside className="screen-switcher">
        <h1>Stitch to React</h1>
        <p>Component-based UI migration</p>
        <div className="switcher-list">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              className={activeScreen === option.key ? 'active' : ''}
              onClick={() => setActiveScreen(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </aside>

      <main className="preview-area">{content}</main>
    </div>
  )
}

export default App
