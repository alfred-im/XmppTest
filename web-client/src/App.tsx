import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'
import { UI } from './config/constants'
import { login, registerAccount } from './services/xmpp'

const MIN_PASSWORD_LENGTH = 6

type AsyncState = 'idle' | 'pending' | 'success' | 'error'

type FormStatus = {
  state: AsyncState
  message?: string
  details?: string
}

const initialStatus: FormStatus = { state: 'idle' }

/**
 * Valida e normalizza un JID secondo RFC 6122
 * Un JID valido ha formato: [local@]domain[/resource]
 */
const validateAndNormalizeJid = (input: string): { valid: boolean; jid?: string; error?: string } => {
  const trimmed = input.trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Il JID non può essere vuoto.' }
  }

  // Controlla formato base: deve contenere almeno un @ per separare local da domain
  if (!trimmed.includes('@')) {
    return { valid: false, error: 'Il JID deve essere completo (formato: username@domain.com).' }
  }

  const parts = trimmed.split('@')
  if (parts.length !== 2) {
    return { valid: false, error: 'Il JID non può contenere più di un simbolo @.' }
  }

  const [local, domainPart] = parts
  const [domain, resource] = domainPart.split('/')

  // Valida local part (se presente)
  if (local && local.length > 0) {
    // Local part non può essere vuoto se c'è @
    if (local.length > 1023) {
      return { valid: false, error: 'La parte locale del JID è troppo lunga (max 1023 caratteri).' }
    }
  }

  // Valida domain
  if (!domain || domain.length === 0) {
    return { valid: false, error: 'Il dominio del JID non può essere vuoto.' }
  }

  if (domain.length > 1023) {
    return { valid: false, error: 'Il dominio del JID è troppo lungo (max 1023 caratteri).' }
  }

  // Normalizza: lowercase per domain, preserva case per local
  const normalizedDomain = domain.toLowerCase()
  const normalizedJid = local ? `${local}@${normalizedDomain}${resource ? `/${resource}` : ''}` : normalizedDomain

  return { valid: true, jid: normalizedJid }
}

function App() {
  const [registerForm, setRegisterForm] = useState({ jid: '', password: '', confirm: '' })
  const [loginForm, setLoginForm] = useState({ jid: '', password: '' })

  const [registerStatus, setRegisterStatus] = useState<FormStatus>(initialStatus)
  const [loginStatus, setLoginStatus] = useState<FormStatus>(initialStatus)

  const handleRegisterChange = (field: 'jid' | 'password' | 'confirm') => (event: ChangeEvent<HTMLInputElement>) => {
    setRegisterForm((prev) => ({ ...prev, [field]: event.target.value }))
    setRegisterStatus(initialStatus)
  }

  const handleLoginChange = (field: 'jid' | 'password') => (event: ChangeEvent<HTMLInputElement>) => {
    setLoginForm((prev) => ({ ...prev, [field]: event.target.value }))
    setLoginStatus(initialStatus)
  }

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (registerStatus.state === 'pending') {
      return
    }

    const jidValidation = validateAndNormalizeJid(registerForm.jid)
    if (!jidValidation.valid) {
      setRegisterStatus({ state: 'error', message: jidValidation.error || 'JID non valido.' })
      return
    }

    const password = registerForm.password
    const confirm = registerForm.confirm

    if (password.length < MIN_PASSWORD_LENGTH) {
      setRegisterStatus({
        state: 'error',
        message: `La password deve contenere almeno ${MIN_PASSWORD_LENGTH} caratteri.`,
      })
      return
    }

    if (password !== confirm) {
      setRegisterStatus({ state: 'error', message: 'Le due password non coincidono.' })
      return
    }

    setRegisterStatus({ state: 'pending', message: 'Invio richiesta di registrazione...' })

    try {
      const result = await registerAccount({
        jid: jidValidation.jid!,
        password,
      })

      setRegisterStatus({
        state: result.success ? 'success' : 'error',
        message: result.message,
        details: result.success ? result.jid : result.details,
      })
    } catch (error) {
      setRegisterStatus({
        state: 'error',
        message: 'Errore inatteso durante la registrazione.',
        details: (error as Error).message,
      })
    }
  }

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loginStatus.state === 'pending') {
      return
    }

    const jidValidation = validateAndNormalizeJid(loginForm.jid)
    if (!jidValidation.valid) {
      setLoginStatus({ state: 'error', message: jidValidation.error || 'JID non valido.' })
      return
    }

    const password = loginForm.password

    if (!password) {
      setLoginStatus({ state: 'error', message: 'Inserisci la password per continuare.' })
      return
    }

    setLoginStatus({ state: 'pending', message: 'Connessione al server...' })

    try {
      const result = await login({
        jid: jidValidation.jid!,
        password,
      })

      setLoginStatus({
        state: result.success ? 'success' : 'error',
        message: result.message,
        details: result.jid || result.details,
      })
    } catch (error) {
      setLoginStatus({
        state: 'error',
        message: 'Errore inatteso durante il login.',
        details: (error as Error).message,
      })
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Proof-of-concept</p>
          <h1>{UI.appName}</h1>
          <p className="tagline">{UI.tagline}</p>
          <ul className="checklist">
            <li>Registrazione XEP-0077 senza backend.</li>
            <li>Login e verifica presenza via WebSocket sicuro.</li>
            <li>Discovery automatico server secondo standard XMPP (SRV, XEP-0156).</li>
            <li>Pronto per deploy statico (GitHub Pages/Netlify).</li>
          </ul>
        </div>
      </header>

      <main className="panels">
        <section className="auth-card">
          <div className="auth-card__header">
            <h3>Accedi</h3>
            <p>Inserisci il tuo JID completo (formato: username@domain.com)</p>
          </div>
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>JID</span>
                <input
                  autoComplete="username"
                  value={loginForm.jid}
                  onChange={handleLoginChange('jid')}
                  placeholder="es. mario@example.com"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={handleLoginChange('password')}
                />
              </label>
            </div>
            <div className="actions">
              <button type="submit" disabled={loginStatus.state === 'pending'}>
                {loginStatus.state === 'pending' ? 'Connessione in corso...' : 'Collegati'}
              </button>
            </div>
          </form>
          <StatusBanner status={loginStatus} successHint="Sessione pronta: puoi passare al roster/chat." />
        </section>

        <section className="auth-card">
          <div className="auth-card__header">
            <h3>Crea account</h3>
            <div className="info-box" style={{ 
              background: '#fff3cd', 
              border: '1px solid #ffc107', 
              borderRadius: '4px', 
              padding: '0.75rem', 
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: '500' }}>
                ℹ️ La maggior parte dei server pubblici ha disabilitato la registrazione in-band per policy anti-spam.
              </p>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                Per questi server è necessario registrarsi tramite i loro siti web. Esempi:
              </p>
              <ul style={{ margin: '0', paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
                <li>
                  <a href="https://account.conversations.im/register/" target="_blank" rel="noopener noreferrer">
                    https://account.conversations.im/register/
                  </a>
                </li>
                <li>
                  <a href="https://trashserver.net/en/register/" target="_blank" rel="noopener noreferrer">
                    https://trashserver.net/en/register/
                  </a>
                </li>
              </ul>
            </div>
            <p>Se il tuo server supporta la registrazione in-band (XEP-0077), usa il form qui sotto:</p>
          </div>
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>JID</span>
                <input
                  autoComplete="username"
                  value={registerForm.jid}
                  onChange={handleRegisterChange('jid')}
                  placeholder="es. nomeutente@example.com"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={registerForm.password}
                  onChange={handleRegisterChange('password')}
                  placeholder="Minimo 6 caratteri"
                />
              </label>
              <label className="field">
                <span>Conferma</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={registerForm.confirm}
                  onChange={handleRegisterChange('confirm')}
                />
              </label>
            </div>
            <div className="actions">
              <button type="submit" disabled={registerStatus.state === 'pending'}>
                {registerStatus.state === 'pending' ? 'Attendere...' : 'Registra e collega'}
              </button>
            </div>
          </form>
          <StatusBanner status={registerStatus} successHint="Copiati subito il JID, ti servirà per il login." />
        </section>
      </main>

      <section className="notes">
        <h4>Come testare rapidamente</h4>
        <ol>
          <li>Registra un account usando il server pubblico suggerito o il tuo.</li>
          <li>Una volta creato, ripeti il login per confermare che la sessione parte.</li>
          <li>Successivamente estenderemo l'interfaccia con roster e conversazioni.</li>
        </ol>
        <p className="muted">
          Deployment: esegui <code>npm run build</code> e pubblica la cartella <code>dist/</code> su GitHub Pages o qualsiasi hosting
          statico.
        </p>
      </section>
    </div>
  )
}

const StatusBanner = ({ status, successHint }: { status: FormStatus; successHint: string }) => {
  if (status.state === 'idle') {
    return null
  }

  return (
    <div className={`status status--${status.state}`}>
      <p>{status.message}</p>
      {status.details && <p className="status__details">{status.details}</p>}
      {status.state === 'success' && successHint && <p className="status__hint">{successHint}</p>}
    </div>
  )
}

export default App
