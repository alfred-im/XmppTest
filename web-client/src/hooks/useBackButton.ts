import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Hook per gestire il pulsante indietro del browser
 * Naviga indietro nella cronologia quando possibile, altrimenti va alla lista conversazioni
 */
export function useBackButton() {
  const navigate = useNavigate()

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Se c'è una cronologia, il browser gestisce automaticamente
      // Altrimenti possiamo gestire manualmente
      if (window.history.length <= 1) {
        navigate('/conversations', { replace: true })
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [navigate])
}
