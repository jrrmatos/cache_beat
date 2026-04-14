import { existsSync, mkdirSync } from 'node:fs'
import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { folders } from '../../database/schema'
import { db } from '../../database/index'
import { assertUniqueSibling, normalizeFolderName, resolveFolderPath } from '../../utils/folders'

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const name = normalizeFolderName(body.name)
  const parentId = body.parentId ?? null

  if (parentId) {
    const parent = db.select().from(folders).where(eq(folders.id, parentId)).get()
    if (! parent) {
      throw createError({ statusCode: 404, message: 'Parent folder not found' })
    }
  }

  assertUniqueSibling(name, parentId)

  const now = Date.now()
  const id = crypto.randomUUID()

  db.insert(folders).values({
    id,
    name,
    parentId,
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
