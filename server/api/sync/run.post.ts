import { runMetadataSync, runFileSync, isSyncRunning } from '../../utils/sync'

export default defineEventHandler(async () => {
  if (isSyncRunning()) {
    throw createError({ statusCode: 409, message: 'Sync is already running' })
  }

  Promise.resolve()
    .then(() => runMetadataSync())
    .then(() => runFileSync())
    .catch((error) => {
      console.error('[sync] manual sync failed:', error)
    })

  return { ok: true, message: 'Sync started' }
})
