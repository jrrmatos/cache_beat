import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { playlists } from '../../database/schema'
import { db } from '../../database/index'
import { syncPlaylistMetadata } from '../../utils/sync'

const bodySchema = z.object({
  youtubeId: z.string().min(1),
  title: z.string().min(1),
  thumbnailUrl: z.string().nullable().optional(),
  outputPath: z.string().nullable().optional(),
  syncFrequency: z.enum(['hourly', 'daily', 'weekly', 'manual']).default('daily'),
  audioQuality: z.string().default('0'),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const now = Date.now()

  const id = crypto.randomUUID()
  db.insert(playlists).values({
    id,
    youtubeId: body.youtubeId,
    title: body.title,
    thumbnailUrl: body.thumbnailUrl ?? null,
    outputPath: body.outputPath ?? null,
    syncFrequency: body.syncFrequency,
    audioQuality: body.audioQuality,
    isActive: 1,
    createdAt: now,
    updatedAt: now,
  }).run()

  syncPlaylistMetadata(id).catch((error) => {
    console.error(`[sync] initial metadata sync failed for ${body.title}:`, error)
  })

  return db.select().from(playlists).where(eq(playlists.id, id)).get()
})
