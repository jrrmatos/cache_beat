import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { folders, playlists } from '../../database/schema'
import { db } from '../../database/index'

const querySchema = z.object({
  deletePlaylist: z.enum(['true', 'false']).default('false'),
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

  const playlistId = folder.playlistId

  // Cascade deletes child folders and tracks
  db.delete(folders).where(eq(folders.id, id)).run()

  if (playlistId && deletePlaylist === 'true') {
    db.delete(playlists).where(eq(playlists.id, playlistId)).run()
  }

  return { ok: true }
})
