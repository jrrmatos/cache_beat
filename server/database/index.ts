import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const dataDir = resolve('data')
if (! existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

const sqlite = new Database(resolve(dataDir, 'beat.db'))
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
export { sqlite }
