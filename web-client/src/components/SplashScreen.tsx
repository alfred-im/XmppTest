import { useEffect, useState } from 'react'
import './SplashScreen.css'

interface SplashScreenProps {
  onFinish?: () => void
  message?: string
  error?: boolean
}

/**
 * Splash screen mostrato durante il caricamento iniziale dell'app
 */
export function SplashScreen({ onFinish, message, error }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Se c'è una callback onFinish, usa il comportamento auto-dismiss
    if (onFinish) {
      // Mostra lo splash screen per almeno 500ms per evitare flash
      const minDisplayTime = setTimeout(() => {
        setIsVisible(false)
        // Aspetta la fine dell'animazione prima di chiamare onFinish
        setTimeout(() => {
          onFinish()
        }, 300) // Durata animazione fade-out
      }, 500)

      return () => {
        clearTimeout(minDisplayTime)
      }
    }
    // Se non c'è onFinish, rimane visibile (controllato dall'esterno)
  }, [onFinish])

  if (!isVisible) {
    return null
  }

  return (
    <div className={`splash-screen ${!isVisible ? 'splash-screen--fade-out' : ''}`}>
      <div className="splash-screen__content">
        <div className="splash-screen__logo" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="#2D2926" />
            <path d="M20 32L28 40L44 24" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="splash-screen__title">Alfred</h1>
        <p className="splash-screen__subtitle">
          {message || 'Messaggistica istantanea'}
        </p>
        {error && (
          <p style={{ color: '#ff6b6b', marginTop: '10px', fontSize: '14px' }}>
            Si è verificato un errore
          </p>
        )}
      </div>
    </div>
  )
}
