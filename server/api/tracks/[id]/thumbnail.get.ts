import { existsSync } from 'node:fs'
import { parseFile } from 'music-metadata'
import { eq } from 'drizzle-orm'
import { tracks } from '../../../database/schema'
import { db } from '../../../database/index'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const track = db.select().from(tracks).where(eq(tracks.id, id)).get()
  if (! track?.filePath || ! existsSync(track.filePath)) {
    throw createError({ statusCode: 404, message: 'Track file not found' })
  }

  const metadata = await parseFile(track.filePath)
  const picture = metadata.common.picture?.[0]
  if (! picture) {
    throw createError({ statusCode: 404, message: 'No embedded artwork' })
  }

  setResponseHeader(event, 'Content-Type', picture.format)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')
  return picture.data
})
