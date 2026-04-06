import { eq } from 'drizzle-orm'
import { settings } from '../database/schema'
import { db } from '../database/index'
import { decrypt, encrypt } from './encryption'

export async function getSetting(key: string): Promise<string | null> {
  const row = db.select().from(settings).where(eq(settings.key, key)).get()
  if (! row) {
    return null
  }
  return decrypt(row.value)
}

export async function setSetting(key: string, value: string): Promise<void> {
  const now = Date.now()
  const encrypted = encrypt(value)
  const existing = db.select({ id: settings.id }).from(settings).where(eq(settings.key, key)).get()

  if (existing) {
    db.update(settings).set({ value: encrypted, updatedAt: now }).where(eq(settings.key, key)).run()
  }
  else {
    db.insert(settings).values({
      id: crypto.randomUUID(),
      key,
      value: encrypted,
      createdAt: now,
      updatedAt: now,
    }).run()
  }
}

export async function deleteSetting(key: string): Promise<void> {
  db.delete(settings).where(eq(settings.key, key)).run()
}
