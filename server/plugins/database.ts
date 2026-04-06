import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from '../database/index'

export default defineNitroPlugin(() => {
  migrate(db, { migrationsFolder: 'server/database/migrations' })
  console.log('[cache_beat] database initialized')
})
