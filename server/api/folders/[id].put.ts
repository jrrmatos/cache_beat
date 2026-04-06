import { existsSync, renameSync } from 'node:fs'
import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { folders, tracks } from '../../database/schema'
import { db } from '../../database/index'
import { resolveFolderPath } from '../../utils/folders'

const bodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  parentId: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const body = await readValidatedBody(event, bodySchema.parse)
  const folder = db.select().from(folders).where(eq(folders.id, id)).get()
  if (! folder) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }

  if (body.name && /[<>:"\\|?*]/.test(body.name)) {
    throw createError({ statusCode: 400, message: 'Invalid folder name' })
  }

  // Rename filesystem directory if name changed
  if (body.name && body.name !== folder.name) {
    const oldPath = await resolveFolderPath(id)
    // Temporarily update name to compute new path
    db.update(folders).set({ name: body.name, updatedAt: Date.now() }).where(eq(folders.id, id)).run()
    const newPath = await resolveFolderPath(id)

    if (existsSync(oldPath)) {
      renameSync(oldPath, newPath)

      // Update filePaths of all tracks in this folder
      const folderTracks = db.select().from(tracks).where(eq(tracks.folderId, id)).all()
      const now = Date.now()
      for (const track of folderTracks) {
        if (track.filePath && track.filePath.startsWith(oldPath)) {
          const newFilePath = track.filePath.replace(oldPath, newPath)
          db.update(tracks)
            .set({ filePath: newFilePath, updatedAt: now })
            .where(eq(tracks.id, track.id))
            .run()
        }
      }
    }
  }
  else {
    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (body.name) {
      updates.name = body.name
    }
    if (body.parentId !== undefined) {
      updates.parentId = body.parentId
    }
    db.update(folders).set(updates).where(eq(folders.id, id)).run()
  }

  return db.select().from(folders).where(eq(folders.id, id)).get()
})
