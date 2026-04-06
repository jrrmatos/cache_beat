import { z } from 'zod/v4'
import { syncPlaylistMetadata, syncPlaylistFiles } from '../../../utils/sync'

const querySchema = z.object({
  type: z.enum(['metadata', 'files', 'all']).default('all'),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const { type } = await getValidatedQuery(event, querySchema.parse)

  if (type === 'metadata') {
    const metadata = await syncPlaylistMetadata(id)
    return metadata
  }

  if (type === 'files') {
    syncPlaylistFiles(id).catch((error) => {
      console.error(`[file-sync] playlist ${id} failed:`, error)
    })
    return { ok: true, message: 'File sync started' }
  }

  // type === 'all'
  const metadata = await syncPlaylistMetadata(id)
  syncPlaylistFiles(id).catch((error) => {
    console.error(`[file-sync] playlist ${id} failed:`, error)
  })
  return { ...metadata, message: 'File sync started' }
})
