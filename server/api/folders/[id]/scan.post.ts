import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import { folders, tracks } from '../../../database/schema'
import { db } from '../../../database/index'
import { resolveFolderPath } from '../../../utils/folders'

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

  const outputDir = await resolveFolderPath(id)
  if (! existsSync(outputDir)) {
    return { added: 0 }
  }

  const files = readdirSync(outputDir).filter(file => file.toLowerCase().endsWith('.mp3'))
  const existingTracks = db.select().from(tracks).where(eq(tracks.folderId, id)).all()
  const existingFilePaths = new Set(existingTracks.map(track => track.filePath))

  // Get max position
  let maxPosition = existingTracks.reduce((max, track) => Math.max(max, track.position), - 1)

  const now = Date.now()
  let added = 0

  for (const file of files) {
    const fullPath = resolve(outputDir, file)
    if (existingFilePaths.has(fullPath)) {
      continue
    }

    const title = stripNumberPrefix(file.replace(/\.mp3$/i, ''))
    maxPosition ++

    db.insert(tracks).values({
      id: crypto.randomUUID(),
      folderId: id,
      youtubeId: null,
      title,
      artist: null,
      durationSeconds: null,
      position: maxPosition,
      thumbnailUrl: null,
      filePath: fullPath,
      status: 'completed',
      removedFromSource: 0,
      createdAt: now,
      updatedAt: now,
    }).run()
    added ++
  }

  return { added }
})
