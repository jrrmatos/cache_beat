import { isSyncRunning } from '../../utils/sync'

export default defineEventHandler(() => {
  return { running: isSyncRunning() }
})
