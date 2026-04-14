import { eq } from 'drizzle-orm'
import { folders } from '../../../database/schema'
import { db } from '../../../database/index'
import { resolveFolderPath } from '../../../utils/folders'
import { writePlaceholderImage } from '../../../utils/folderImage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const folder = db.select().from(folders).where(eq(folders.id, id)).get()
  if (! folder) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }

  const folderPath = await resolveFolderPath(id)
  await writePlaceholderImage(folderPath)

  return { imageStatus: 'placeholder' as const }
})
