import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { folders, playlists } from '../../../database/schema'
import { db } from '../../../database/index'

const querySchema = z.object({
  deletePlaylist: z.enum(['true', 'false']).default('true'),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const { deletePlaylist } = await getValidatedQuery(event, querySchema.parse)

  const folder = db.select().from(folders).where(eq(folders.id, id)).get()
  if (! folder) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }
  if (! folder.playlistId) {
    throw createError({ statusCode: 400, message: 'Folder has no playlist attached' })
  }

  const playlistId = folder.playlistId

  db.update(folders)
    .set({ playlistId: null, updatedAt: Date.now() })
    .where(eq(folders.id, id))
    .run()

  if (deletePlaylist === 'true') {
    db.delete(playlists).where(eq(playlists.id, playlistId)).run()
  }

  return { ok: true }
})
