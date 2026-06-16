import { getDB } from '../conversations-db'
import type { OutboxEntry, OutboxStatus } from '../../types/outbox'

export class OutboxRepository {
  async save(entry: OutboxEntry): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('outbox', 'readwrite')
    await tx.store.put({
      ...entry,
      timestamp: entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp),
    })
    await tx.done
  }

  async getByTempId(tempId: string): Promise<OutboxEntry | null> {
    const db = await getDB()
    const tx = db.transaction('outbox', 'readonly')
    const entry = await tx.store.get(tempId)
    await tx.done
    if (!entry) return null
    return normalize(entry)
  }

  async getAll(): Promise<OutboxEntry[]> {
    const db = await getDB()
    const tx = db.transaction('outbox', 'readonly')
    const entries = await tx.store.getAll()
    await tx.done
    return entries.map(normalize)
  }

  async getQueued(): Promise<OutboxEntry[]> {
    const all = await this.getAll()
    return all.filter(
      (e) => e.status === 'failed' || (e.status === 'queued' && !e.stanzaId)
    )
  }

  async updateStatus(tempId: string, status: OutboxStatus, extra?: Partial<OutboxEntry>): Promise<void> {
    const existing = await this.getByTempId(tempId)
    if (!existing) return
    await this.save({ ...existing, ...extra, status })
  }

  async delete(tempId: string): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('outbox', 'readwrite')
    await tx.store.delete(tempId)
    await tx.done
  }
}

function normalize(entry: OutboxEntry): OutboxEntry {
  return {
    ...entry,
    timestamp: entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp),
  }
}

export const outboxRepository = new OutboxRepository()
