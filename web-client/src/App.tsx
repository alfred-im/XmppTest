import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { XmppProvider } from './contexts/XmppContext'
import { LoginPage } from './pages/LoginPage'
import { ConversationsPage } from './pages/ConversationsPage'
import './App.css'

// Redirect logic for GitHub Pages SPA routing
function RedirectHandler() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Check if we have a redirect query parameter (from 404.html)
    const searchParams = new URLSearchParams(location.search)
    const redirectPath = searchParams.get('/')
    
    if (redirectPath) {
      // Replace ~and~ with & in the path
      const path = redirectPath.replace(/~and~/g, '&')
      navigate(path, { replace: true })
    }
  }, [location.search, navigate])

  return null
}

function App() {
  return (
    <XmppProvider>
      <BrowserRouter basename="/XmppTest">
        <RedirectHandler />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </XmppProvider>
  )
}

export default App
