import { z } from 'zod/v4'
import { eq, and, max } from 'drizzle-orm'
import { playlists, tracks } from '../../../database/schema'
import { db } from '../../../database/index'
import { getVideoDetails } from '../../../utils/youtube'

const bodySchema = z.object({
  url: z.string().optional(),
  youtubeId: z.string().optional(),
}).refine(
  data => data.url || data.youtubeId,
  { message: 'Either url or youtubeId is required' },
)

function parseYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'music.youtube.com' || parsed.hostname === 'www.youtube.com' || parsed.hostname === 'youtube.com') {
      return parsed.searchParams.get('v')
    }
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1)
    }
  }
  catch {
    // not a valid URL
  }
  return null
}

function parseDuration(isoDuration: string | null | undefined): number | null {
  if (! isoDuration) {
    return null
  }
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (! match) {
    return null
  }
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)
  return hours * 3600 + minutes * 60 + seconds
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const playlist = db.select().from(playlists).where(eq(playlists.id, id)).get()
  if (! playlist) {
    throw createError({ statusCode: 404, message: 'Playlist not found' })
  }
  if (! playlist.isCustom) {
    throw createError({ statusCode: 400, message: 'Can only add tracks to custom playlists' })
  }

  const body = await readValidatedBody(event, bodySchema.parse)

  let videoId = body.youtubeId ?? null
  let overrideUrl: string | null = null

  if (body.url) {
    const parsed = parseYoutubeVideoId(body.url)
    if (parsed) {
      videoId = parsed
    }
    else {
      overrideUrl = body.url
      videoId = `custom-${crypto.randomUUID().slice(0, 8)}`
    }
  }

  if (! videoId) {
    throw createError({ statusCode: 400, message: 'Could not determine video ID' })
  }

  // Check duplicate
  const existing = db.select().from(tracks)
    .where(and(eq(tracks.playlistId, id), eq(tracks.youtubeId, videoId)))
    .get()
  if (existing) {
    throw createError({ statusCode: 409, message: 'Track already in playlist' })
  }

  // Fetch metadata from YouTube if we have a real video ID
  let title = 'Unknown'
  let artist: string | null = null
  let thumbnailUrl: string | null = null
  let durationSeconds: number | null = null

  if (! overrideUrl) {
    try {
      const video = await getVideoDetails(videoId)
      if (video) {
        title = video.snippet?.title ?? 'Unknown'
        artist = video.snippet?.channelTitle ?? null
        thumbnailUrl = video.snippet?.thumbnails?.medium?.url ?? null
        durationSeconds = parseDuration(video.contentDetails?.duration)
      }
    }
    catch (error) {
      console.error(`[tracks] failed to fetch video details for ${videoId}:`, error)
    }
  }

  // Get next position
  const maxPos = db.select({ value: max(tracks.position) }).from(tracks)
    .where(eq(tracks.playlistId, id))
    .get()
  const position = (maxPos?.value ?? - 1) + 1

  const now = Date.now()
  const trackId = crypto.randomUUID()

  db.insert(tracks).values({
    id: trackId,
    playlistId: id,
    youtubeId: videoId,
    title,
    artist,
    durationSeconds,
    position,
    thumbnailUrl,
    status: 'pending',
    overrideUrl,
    removedFromSource: 0,
    createdAt: now,
    updatedAt: now,
  }).run()

  return db.select().from(tracks).where(eq(tracks.id, trackId)).get()
})
