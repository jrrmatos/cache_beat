import { z } from 'zod/v4'
import { syncFoldersFromDisk, forceSyncFoldersFromDisk } from '../../utils/sync'

const querySchema = z.object({
  force: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { force } = await getValidatedQuery(event, querySchema.parse)

  if (force === 'true') {
    return await forceSyncFoldersFromDisk()
  }

  return await syncFoldersFromDisk()
})
