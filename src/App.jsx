import { useState, useEffect } from 'react'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'

export default function App() {
  // Initialise from localStorage so a page refresh keeps the correct dashboard
  const [loggedIn, setLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('mineguard_jwt_token')
    const storedRole  = localStorage.getItem('mineguard_user_role')
    if (storedToken && storedRole) {
      setUserRole(storedRole)
      setLoggedIn(true)
    }
  }, [])

  const handleLogin = (role) => {
    setUserRole(role)
    setLoggedIn(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('mineguard_jwt_token')
    localStorage.removeItem('mineguard_user_role')
    setLoggedIn(false)
    setUserRole(null)
  }

  if (!loggedIn || !userRole) {
    return <LoginPage onLogin={handleLogin} />
  }
  return <Dashboard userRole={userRole} onLogout={handleLogout} />
}
