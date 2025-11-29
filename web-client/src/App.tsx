import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { XmppProvider, useXmpp } from './contexts/XmppContext'
import { LoginPage } from './pages/LoginPage'
import { ConversationsPage } from './pages/ConversationsPage'
import './App.css'

// Redirect logic for GitHub Pages SPA routing
function RedirectHandler() {
  const location = useLocation()
  const navigate = useNavigate()
  const hasRedirected = useRef(false)

  useEffect(() => {
    // Check if we have a redirect query parameter (from 404.html)
    // The 404.html creates URLs like /?/XmppTest/conversations
    const searchParams = new URLSearchParams(location.search)
    const redirectPath = searchParams.get('/')
    
    if (redirectPath && !hasRedirected.current) {
      hasRedirected.current = true
      
      // Replace ~and~ with & in the path
      let path = redirectPath.replace(/~and~/g, '&')
      
      // Remove leading/trailing slashes and normalize
      path = path.replace(/^\/+|\/+$/g, '')
      
      // Remove the basePath (XmppTest) from the path since basename handles it
      if (path.startsWith('XmppTest')) {
        path = path.substring('XmppTest'.length)
        // Remove leading slash if present
        path = path.replace(/^\/+/, '')
      }
      
      // Build target path: empty string for root, or /path for sub-routes
      const targetPath = path === '' ? '/' : '/' + path
      
      // Navigate immediately to clean up the URL
      navigate(targetPath, { replace: true })
    }
    
    // Reset the flag when search params change
    if (!location.search) {
      hasRedirected.current = false
    }
  }, [location.search, navigate])

  return null
}

// Component to handle initial routing based on connection status
function InitialRouteHandler() {
  const { isConnected } = useXmpp()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    // Only redirect if we're at the root path and not already navigating
    if (location.pathname === '/') {
      if (isConnected) {
        // If connected, redirect to conversations
        navigate('/conversations', { replace: true })
      }
      // If not connected, stay on login page (no redirect needed)
    }
  }, [isConnected, location.pathname, navigate])

  return null
}

function AppRoutes() {
  return (
    <>
      <RedirectHandler />
      <InitialRouteHandler />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/conversations" element={<ConversationsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
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
