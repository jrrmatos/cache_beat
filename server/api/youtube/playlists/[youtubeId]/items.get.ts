import { z } from 'zod/v4'
import { getPlaylistItems } from '../../../../utils/youtube'

const querySchema = z.object({
  pageToken: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const youtubeId = getRouterParam(event, 'youtubeId')
  if (! youtubeId) {
    throw createError({ statusCode: 400, message: 'youtubeId is required' })
  }
  const { pageToken } = await getValidatedQuery(event, querySchema.parse)
  return await getPlaylistItems(youtubeId, pageToken)
})
