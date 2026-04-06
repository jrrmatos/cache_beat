import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { playlists } from '../../database/schema'
import { db } from '../../database/index'

const bodySchema = z.object({
  title: z.string().min(1),
  outputFolder: z.string().nullable().optional(),
  audioQuality: z.string().default('0'),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const now = Date.now()
  const id = crypto.randomUUID()

  db.insert(playlists).values({
    id,
    youtubeId: null,
    title: body.title,
    thumbnailUrl: null,
    outputFolder: body.outputFolder ?? null,
    syncFrequency: 'manual',
    audioQuality: body.audioQuality,
    isActive: 1,
    isCustom: 1,
    createdAt: now,
    updatedAt: now,
  }).run()

  return db.select().from(playlists).where(eq(playlists.id, id)).get()
})
