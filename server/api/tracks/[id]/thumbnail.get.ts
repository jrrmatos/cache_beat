import { existsSync } from 'node:fs'
import { parseFile } from 'music-metadata'
import { eq } from 'drizzle-orm'
import { tracks } from '../../../database/schema'
import { db } from '../../../database/index'

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <rect width="120" height="120" fill="#27272a"/>
  <path d="M60 35a5 5 0 0 1 5 5v20l15-8.66a5 5 0 0 1 5 8.66L70 68.66V80a10 10 0 1 1-10-10V40a5 5 0 0 1 5-5z" fill="#52525b"/>
</svg>`

function sendPlaceholder(event: Parameters<typeof defineEventHandler>[0] extends (e: infer E) => unknown ? E : never) {
  setResponseHeader(event, 'Content-Type', 'image/svg+xml')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')
  return PLACEHOLDER_SVG
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    return sendPlaceholder(event)
  }

  const track = db.select().from(tracks).where(eq(tracks.id, id)).get()
  if (! track?.filePath || ! existsSync(track.filePath)) {
    return sendPlaceholder(event)
  }

  try {
    const metadata = await parseFile(track.filePath)
    const picture = metadata.common.picture?.[0]
    if (! picture) {
      return sendPlaceholder(event)
    }

    setResponseHeader(event, 'Content-Type', picture.format)
    setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')
    return picture.data
  }
  catch {
    return sendPlaceholder(event)
  }
})
