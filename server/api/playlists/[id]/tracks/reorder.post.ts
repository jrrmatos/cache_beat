import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { dirname, basename, resolve } from 'node:path'
import { existsSync, renameSync } from 'node:fs'
import { playlists, tracks } from '../../../../database/schema'
import { db } from '../../../../database/index'

const bodySchema = z.object({
  trackIds: z.array(z.string()).min(1),
})

function stripNumberPrefix(filename: string): string {
  return filename.replace(/^\d+\s*-\s*/, '')
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const playlist = db.select().from(playlists).where(eq(playlists.id, id)).get()
  if (! playlist) {
    throw createError({ statusCode: 404, message: 'Playlist not found' })
  }
  if (! playlist.isCustom) {
    throw createError({ statusCode: 400, message: 'Can only reorder tracks in custom playlists' })
  }

  const { trackIds } = await readValidatedBody(event, bodySchema.parse)
  const now = Date.now()

  for (let index = 0; index < trackIds.length; index ++) {
    const track = db.select().from(tracks).where(eq(tracks.id, trackIds[index])).get()
    if (! track || track.playlistId !== id) {
      continue
    }

    db.update(tracks)
      .set({ position: index, updatedAt: now })
      .where(eq(tracks.id, trackIds[index]))
      .run()

    // Rename file if exists
    if (track.filePath && existsSync(track.filePath)) {
      const dir = dirname(track.filePath)
      const oldName = basename(track.filePath)
      const paddedPosition = String(index + 1).padStart(2, '0')
      const nameWithoutNumber = stripNumberPrefix(oldName)
      const newName = `${paddedPosition} - ${nameWithoutNumber}`
      if (oldName !== newName) {
        const newPath = resolve(dir, newName)
        renameSync(track.filePath, newPath)
        db.update(tracks)
          .set({ filePath: newPath, updatedAt: now })
          .where(eq(tracks.id, trackIds[index]))
          .run()
      }
    }
  }

  return { success: true }
})
