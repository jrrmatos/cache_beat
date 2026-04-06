import { syncFoldersFromDisk } from '../../utils/sync'

export default defineEventHandler(async () => {
  return await syncFoldersFromDisk()
})
