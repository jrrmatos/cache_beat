import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { folders, playlists } from '../../../database/schema'
import { db } from '../../../database/index'
import { syncPlaylistMetadata, syncPlaylistFiles, syncFolderFiles } from '../../../utils/sync'

const querySchema = z.object({
  type: z.enum(['metadata', 'files', 'all']).default('all'),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const folder = db.select().from(folders).where(eq(folders.id, id)).get()
  if (! folder) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }

  const { type } = await getValidatedQuery(event, querySchema.parse)

  // If folder has no playlist, only file download is supported
  if (! folder.playlistId) {
    syncFolderFiles(id).catch((error) => {
      console.error(`[file-sync] folder ${id} failed:`, error)
    })
    return { ok: true, message: 'File sync started' }
  }

  const playlist = db.select().from(playlists).where(eq(playlists.id, folder.playlistId)).get()
  if (! playlist) {
    throw createError({ statusCode: 404, message: 'Linked playlist not found' })
  }

  if (type === 'metadata') {
    const metadata = await syncPlaylistMetadata(playlist.id)
    return metadata
  }

  if (type === 'files') {
    syncPlaylistFiles(playlist.id).catch((error) => {
      console.error(`[file-sync] folder ${id} failed:`, error)
    })
    return { ok: true, message: 'File sync started' }
  }

  // type === 'all'
  const metadata = await syncPlaylistMetadata(playlist.id)
  syncPlaylistFiles(playlist.id).catch((error) => {
    console.error(`[file-sync] folder ${id} failed:`, error)
  })
  return { ...metadata, message: 'File sync started' }
})
