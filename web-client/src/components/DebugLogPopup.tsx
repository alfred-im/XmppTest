import { useState, useEffect, useRef } from 'react'
import { debugLogger } from '../services/debug-logger'
import type { LogEntry } from '../services/debug-logger'
import { clearDatabase, getDB } from '../services/conversations-db'
import './DebugLogPopup.css'

interface DebugLogPopupProps {
  onClose: () => void
}

export function DebugLogPopup({ onClose }: DebugLogPopupProps) {
  const [logs, setLogs] = useState<LogEntry[]>(debugLogger.getLogs())
  const [filter, setFilter] = useState<string>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Subscribe ai cambiamenti dei log
    const handleLogsUpdate = (updatedLogs: LogEntry[]) => {
      setLogs(updatedLogs)
    }

    debugLogger.addListener(handleLogsUpdate)

    return () => {
      debugLogger.removeListener(handleLogsUpdate)
    }
  }, [])

  // Auto scroll quando arrivano nuovi log
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const handleClearLogs = () => {
    if (confirm('Sei sicuro di voler cancellare tutti i log?')) {
      debugLogger.clearLogs()
    }
  }

  const handleClearDatabase = async () => {
    if (!confirm('⚠️ ATTENZIONE: Questa operazione cancellerà TUTTI i dati locali (conversazioni, messaggi, vCard, metadata).\n\nDovrai effettuare una nuova sincronizzazione completa al prossimo avvio.\n\nSei sicuro di voler continuare?')) {
      return
    }

    setIsClearing(true)
    try {
      await clearDatabase()
      debugLogger.log('✅ Database svuotato con successo')
      alert('✅ Database svuotato. L\'app si ricaricherà.')
      
      // Ricarica l'app per forzare una nuova sync
      window.location.reload()
    } catch (error) {
      console.error('Errore nello svuotamento database:', error)
      debugLogger.log(`❌ Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
      alert('❌ Errore nello svuotamento del database')
    } finally {
      setIsClearing(false)
    }
  }

  const handleExportText = () => {
    const text = debugLogger.exportLogsAsText()
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-logs-${new Date().toISOString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportJSON = () => {
    const json = debugLogger.exportLogsAsJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-logs-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyToClipboard = async () => {
    try {
      const text = debugLogger.exportLogsAsText()
      await navigator.clipboard.writeText(text)
      alert('Log copiati negli appunti!')
    } catch (error) {
      console.error('Errore durante la copia negli appunti:', error)
      alert('Impossibile copiare negli appunti')
    }
  }

  const handleCopyDatabaseToClipboard = async () => {
    try {
      const db = await getDB()
      
      // Estrai tutti i dati da tutte le store
      const tx = db.transaction(['conversations', 'messages', 'vcards', 'metadata'], 'readonly')
      
      const conversations = await tx.objectStore('conversations').getAll()
      const messages = await tx.objectStore('messages').getAll()
      const vcards = await tx.objectStore('vcards').getAll()
      const metadata = await tx.objectStore('metadata').getAll()
      
      await tx.done
      
      // Crea oggetto con tutti i dati
      const dbSnapshot = {
        timestamp: new Date().toISOString(),
        stats: {
          conversations: conversations.length,
          messages: messages.length,
          vcards: vcards.length,
          metadata: metadata.length,
        },
        data: {
          conversations,
          messages,
          vcards,
          metadata,
        }
      }
      
      // Serializza in JSON formattato
      const json = JSON.stringify(dbSnapshot, null, 2)
      
      // Copia negli appunti
      await navigator.clipboard.writeText(json)
      
      alert(`✅ Database copiato negli appunti!\n\n📊 Statistiche:\n- ${conversations.length} conversazioni\n- ${messages.length} messaggi\n- ${vcards.length} vCard\n- ${metadata.length} metadata`)
    } catch (error) {
      console.error('Errore durante la copia del database:', error)
      alert('❌ Impossibile copiare il database negli appunti')
    }
  }

  const handleScroll = () => {
    if (!containerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10
    
    if (isAtBottom !== autoScroll) {
      setAutoScroll(isAtBottom)
    }
  }

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true
    return log.level === filter
  })

  const getLevelClass = (level: string) => {
    switch (level) {
      case 'error':
        return 'debug-log-popup__entry--error'
      case 'warn':
        return 'debug-log-popup__entry--warn'
      case 'info':
        return 'debug-log-popup__entry--info'
      case 'debug':
        return 'debug-log-popup__entry--debug'
      default:
        return 'debug-log-popup__entry--log'
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  return (
    <div className="debug-log-popup__overlay" onClick={onClose}>
      <div className="debug-log-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="debug-log-popup__header">
          <div className="debug-log-popup__title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <h2>Console Log Debugger</h2>
            <span className="debug-log-popup__count">({filteredLogs.length})</span>
          </div>
          <button 
            className="debug-log-popup__close-btn"
            onClick={onClose}
            aria-label="Chiudi"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="debug-log-popup__toolbar">
          <div className="debug-log-popup__filters">
            <button 
              className={`debug-log-popup__filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Tutti
            </button>
            <button 
              className={`debug-log-popup__filter-btn ${filter === 'log' ? 'active' : ''}`}
              onClick={() => setFilter('log')}
            >
              Log
            </button>
            <button 
              className={`debug-log-popup__filter-btn ${filter === 'info' ? 'active' : ''}`}
              onClick={() => setFilter('info')}
            >
              Info
            </button>
            <button 
              className={`debug-log-popup__filter-btn ${filter === 'warn' ? 'active' : ''}`}
              onClick={() => setFilter('warn')}
            >
              Warn
            </button>
            <button 
              className={`debug-log-popup__filter-btn ${filter === 'error' ? 'active' : ''}`}
              onClick={() => setFilter('error')}
            >
              Error
            </button>
          </div>

          <div className="debug-log-popup__actions">
            <label className="debug-log-popup__autoscroll">
              <input 
                type="checkbox" 
                checked={autoScroll} 
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-scroll
            </label>
            <button 
              className="debug-log-popup__action-btn debug-log-popup__action-btn--primary"
              onClick={handleCopyToClipboard}
              title="Copia tutti i log negli appunti"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copia
            </button>
            <button 
              className="debug-log-popup__action-btn debug-log-popup__action-btn--db"
              onClick={handleCopyDatabaseToClipboard}
              title="Copia tutto il database IndexedDB negli appunti (conversazioni, messaggi, vCard, metadata)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
              Copia DB
            </button>
            <button 
              className="debug-log-popup__action-btn"
              onClick={handleExportText}
              title="Esporta come TXT"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              TXT
            </button>
            <button 
              className="debug-log-popup__action-btn"
              onClick={handleExportJSON}
              title="Esporta come JSON"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              JSON
            </button>
            <button 
              className="debug-log-popup__action-btn debug-log-popup__action-btn--danger"
              onClick={handleClearLogs}
              title="Cancella tutti i log"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Cancella
            </button>
            <button 
              className="debug-log-popup__action-btn debug-log-popup__action-btn--danger-db"
              onClick={handleClearDatabase}
              title="Svuota database locale (ATTENZIONE: elimina tutti i dati!)"
              disabled={isClearing}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                <line x1="3" y1="12" x2="21" y2="12"></line>
              </svg>
              {isClearing ? 'Svuotamento...' : 'Svuota DB'}
            </button>
          </div>
        </div>

        {/* Logs container */}
        <div 
          className="debug-log-popup__logs scrollable-container"
          ref={containerRef}
          onScroll={handleScroll}
        >
          {filteredLogs.length === 0 ? (
            <div className="debug-log-popup__empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <p>Nessun log disponibile</p>
            </div>
          ) : (
            <>
              {filteredLogs.map((log, index) => (
                <div 
                  key={index} 
                  className={`debug-log-popup__entry ${getLevelClass(log.level)}`}
                >
                  <div className="debug-log-popup__entry-header">
                    <span className="debug-log-popup__entry-time">
                      {formatTime(log.timestamp)}
                    </span>
                    <span className="debug-log-popup__entry-level">
                      {log.level.toUpperCase()}
                    </span>
                  </div>
                  <pre className="debug-log-popup__entry-message">{log.message}</pre>
                </div>
              ))}
              <div ref={logsEndRef} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
