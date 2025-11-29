import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { XmppProvider, useXmpp } from './contexts/XmppContext'
import { LoginPage } from './pages/LoginPage'
import { ConversationsPage } from './pages/ConversationsPage'
import './App.css'

function AppRoutes() {
  const { isConnected, isLoading } = useXmpp()
  const location = useLocation()
  const navigate = useNavigate()

  // Wait for initial connection check, then route appropriately
  useEffect(() => {
    if (isLoading) return // Wait for initial connection attempt
    
    if (isConnected && location.pathname === '/') {
      // Connected and on login page -> go to conversations
      navigate('/conversations', { replace: true })
    } else if (!isConnected && location.pathname === '/conversations') {
      // Not connected and on conversations -> go to login
      navigate('/', { replace: true })
    }
  }, [isConnected, isLoading, location.pathname, navigate])

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/conversations" element={<ConversationsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <XmppProvider>
      <BrowserRouter basename="/XmppTest">
        <AppRoutes />
      </BrowserRouter>
    </XmppProvider>
  )
}

export default App
