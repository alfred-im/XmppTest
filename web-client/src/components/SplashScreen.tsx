import { useEffect, useState } from 'react'
import './SplashScreen.css'

interface SplashScreenProps {
  onFinish: () => void
}

/**
 * Splash screen mostrato durante il caricamento iniziale dell'app
 */
export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
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
  }, [onFinish])

  if (!isVisible) {
    return null
  }

  return (
    <div className={`splash-screen ${!isVisible ? 'splash-screen--fade-out' : ''}`}>
      <div className="splash-screen__content">
        <div className="splash-screen__logo" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="#5682a3" />
            <path d="M20 32L28 40L44 24" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="splash-screen__title">Alfred</h1>
        <p className="splash-screen__subtitle">Messaggistica istantanea</p>
      </div>
    </div>
  )
}
