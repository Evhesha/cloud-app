import { useState } from 'react'

// Типы для ответов от API
type AuthResponse = {
  user: {
    id: number;
    name: string;
    email: string;
    role_id: number;
  };
}

type RegisterResponse = {
  id: number;
  name: string;
  email: string;
  role_id: number;
  createdAt: string;
}

type ErrorResponse = {
  error: string;
}

// Базовый URL API
const API_BASE_URL = 'http://localhost:3000';

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Обработчик изменений в полях ввода
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Очищаем ошибки при вводе
    setError(null)
  }

  // Валидация формы
  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email и пароль обязательны')
      return false
    }

    if (mode === 'register') {
      if (!formData.name) {
        setError('Имя обязательно')
        return false
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Пароли не совпадают')
        return false
      }
      if (formData.password.length < 6) {
        setError('Пароль должен содержать минимум 6 символов')
        return false
      }
    }
    return true
  }

  // Метод для входа
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
        credentials: 'include'
      })

      const data = await response.json() as AuthResponse | ErrorResponse

      if (!response.ok) {
        throw new Error((data as ErrorResponse).error || 'Ошибка при входе')
      }

      setSuccess('Вход выполнен успешно!')
      
      const userData = data as AuthResponse
      setTimeout(() => {
        if (userData.user.role_id === 1) {
          window.location.href = '/customer-dashboard'
        } else {
          window.location.href = '/admin-panel'
        }
      }, 1000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Метод для регистрации
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        }),
        credentials: 'include'
      })

      const data = await response.json() as RegisterResponse | ErrorResponse

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('Пользователь с таким email уже существует')
        }
        throw new Error((data as ErrorResponse).error || 'Ошибка при регистрации')
      }

      // Успешная регистрация
      setSuccess('Регистрация выполнена успешно! Теперь вы можете войти.')
      
      // Очищаем форму
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      })

      // Переключаем на экран входа через 2 секунды
      setTimeout(() => {
        setMode('login')
        setSuccess(null)
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
      console.error('Register error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Сброс формы при смене режима
  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    })
    setError(null)
    setSuccess(null)
  }

  return (
    <section className="auth-screen">
      <header className="top-nav">
        <div className="brand">
          <span className="brand-mark" />
          <strong>CloudPlatform IaaS</strong>
        </div>
      </header>

      <div className="auth-body">
        <div className="auth-card">
          <h1>
            {mode === 'login'
              ? 'Sign in to your Cloud Account'
              : 'Create Tenant Account'}
          </h1>

          <p>
            {mode === 'login'
              ? 'Access your virtual infrastructure'
              : 'Start managing your cloud resources'}
          </p>

          {error && (
            <div className="error-message" style={{ 
              color: '#d32f2f', 
              backgroundColor: '#ffebee', 
              padding: '0.75rem', 
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div className="success-message" style={{ 
              color: '#2e7d32', 
              backgroundColor: '#e8f5e9', 
              padding: '0.75rem', 
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {success}
            </div>
          )}

          <div className="switch-row">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => switchMode('login')}
              disabled={loading}
            >
              Sign In
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => switchMode('register')}
              disabled={loading}
            >
              Register
            </button>
          </div>

          <form 
            className="auth-form" 
            onSubmit={mode === 'login' ? handleLogin : handleRegister}
          >
            <label>
              Email Address
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="name@company.com" 
                required 
                disabled={loading}
              />
            </label>

            <label>
              Password
              <input 
                type="password" 
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••" 
                required 
                disabled={loading}
              />
            </label>

            {mode === 'register' && (
              <>
                <label>
                  Confirm Password
                  <input 
                    type="password" 
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••" 
                    required 
                    disabled={loading}
                  />
                </label>
                <label>
                  Full Name
                  <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe" 
                    required 
                    disabled={loading}
                  />
                </label>
              </>
            )}

            <button 
              type="submit" 
              className="primary-btn"
              disabled={loading}
              style={{
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Загрузка...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {mode === 'login' && (
            <p className="auth-footer-note">
              Don't have an account?{' '}
              <button
                type="button"
                className="link-btn"
                onClick={() => switchMode('register')}
                disabled={loading}
              >
                Register
              </button>
            </p>
          )}

          {mode === 'register' && (
            <p className="auth-footer-note">
              Already have an account?{' '}
              <button
                type="button"
                className="link-btn"
                onClick={() => switchMode('login')}
                disabled={loading}
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}