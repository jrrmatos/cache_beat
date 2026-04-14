import { existsSync, mkdirSync, renameSync } from 'node:fs'
import { dirname } from 'node:path'
import { z } from 'zod/v4'
import { eq, inArray } from 'drizzle-orm'
import { folders, tracks } from '../../database/schema'
import { db } from '../../database/index'
import { assertUniqueSibling, getFolderDescendantIds, normalizeFolderName, resolveFolderPath } from '../../utils/folders'

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

  const newName = body.name ? normalizeFolderName(body.name) : undefined
  const parentChanged = body.parentId !== undefined && body.parentId !== folder.parentId
  const nameChanged = newName !== undefined && newName !== folder.name

  if (! nameChanged && ! parentChanged) {
    return folder
  }

  const targetParentId = parentChanged ? (body.parentId ?? null) : folder.parentId
  const targetName = newName ?? folder.name

  if (parentChanged && targetParentId) {
    const parent = db.select().from(folders).where(eq(folders.id, targetParentId)).get()
    if (! parent) {
      throw createError({ statusCode: 404, message: 'Target parent folder not found' })
    }
    const descendants = getFolderDescendantIds(id)
    if (descendants.includes(targetParentId)) {
      throw createError({ statusCode: 400, message: 'Cannot move folder into itself or a descendant' })
    }
  }

  assertUniqueSibling(targetName, targetParentId, id)

  const oldPath = await resolveFolderPath(id)
  const affectedFolderIds = getFolderDescendantIds(id)

  const updates: { name?: string, parentId?: string | null, updatedAt: number } = { updatedAt: Date.now() }
  if (nameChanged) {
    updates.name = newName
  }
  if (parentChanged) {
    updates.parentId = targetParentId
  }
  db.update(folders).set(updates).where(eq(folders.id, id)).run()

  const newPath = await resolveFolderPath(id)

  if (existsSync(oldPath) && oldPath !== newPath) {
    const parentDir = dirname(newPath)
    if (! existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true })
    }
    renameSync(oldPath, newPath)

    const affectedTracks = db.select().from(tracks).where(inArray(tracks.folderId, affectedFolderIds)).all()
    const now = Date.now()
    for (const track of affectedTracks) {
      if (track.filePath && track.filePath.startsWith(oldPath)) {
        const newFilePath = newPath + track.filePath.slice(oldPath.length)
        db.update(tracks)
          .set({ filePath: newFilePath, updatedAt: now })
          .where(eq(tracks.id, track.id))
          .run()
      }
    }
  }

  return db.select().from(folders).where(eq(folders.id, id)).get()
})
