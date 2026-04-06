import { existsSync, mkdirSync } from 'node:fs'
import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { folders } from '../../database/schema'
import { db } from '../../database/index'
import { resolveFolderPath } from '../../utils/folders'

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const { name, parentId } = await readValidatedBody(event, bodySchema.parse)

  if (/[<>:"\\|?*]/.test(name) || name.includes('..')) {
    throw createError({ statusCode: 400, message: 'Invalid folder name' })
  }

  if (parentId) {
    const parent = db.select().from(folders).where(eq(folders.id, parentId)).get()
    if (! parent) {
      throw createError({ statusCode: 404, message: 'Parent folder not found' })
    }
  }

  const now = Date.now()
  const id = crypto.randomUUID()

  db.insert(folders).values({
    id,
    name,
    parentId: parentId ?? null,
    playlistId: null,
    createdAt: now,
    updatedAt: now,
  }).run()

  // Create filesystem directory
  const folderPath = await resolveFolderPath(id)
  if (! existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true })
  }

  return db.select().from(folders).where(eq(folders.id, id)).get()
})
