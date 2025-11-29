import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Handle GitHub Pages 404.html redirect: extract route from query param
const urlParams = new URLSearchParams(window.location.search)
const routeParam = urlParams.get('p')
if (routeParam) {
  const route = decodeURIComponent(routeParam)
  // Clean up URL: remove query param and navigate to clean route
  const basePath = '/XmppTest'
  const cleanUrl = basePath + route
  window.history.replaceState(null, '', cleanUrl)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
