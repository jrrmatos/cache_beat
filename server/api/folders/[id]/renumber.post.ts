import { existsSync, renameSync } from 'node:fs'
import { dirname, basename, resolve } from 'node:path'
import { eq, and } from 'drizzle-orm'
import { folders, tracks } from '../../../database/schema'
import { db } from '../../../database/index'

function stripNumberPrefix(filename: string): string {
  return filename.replace(/^\d+\s*-\s*/, '')
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const folder = db.select().from(folders).where(eq(folders.id, id)).get()
  if (! folder) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }

  const folderTracks = db.select().from(tracks)
    .where(and(eq(tracks.folderId, id), eq(tracks.removedFromSource, 0)))
    .orderBy(tracks.position)
    .all()

  const now = Date.now()
  let renamed = 0

  for (const track of folderTracks) {
    if (! track.filePath || ! existsSync(track.filePath)) {
      continue
    }

    const dir = dirname(track.filePath)
    const oldName = basename(track.filePath)
    const paddedPosition = String(track.position + 1).padStart(2, '0')
    const nameWithoutNumber = stripNumberPrefix(oldName)
    const newName = `${paddedPosition} - ${nameWithoutNumber}`

    if (oldName !== newName) {
      const newPath = resolve(dir, newName)
      renameSync(track.filePath, newPath)
      db.update(tracks)
        .set({ filePath: newPath, updatedAt: now })
        .where(eq(tracks.id, track.id))
        .run()
      renamed ++
    }
  }

  return { renamed }
})
