import { z } from 'zod/v4'
import { getYoutubePlaylists } from '../../utils/youtube'

const querySchema = z.object({
  pageToken: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { pageToken } = await getValidatedQuery(event, querySchema.parse)
  return await getYoutubePlaylists(pageToken)
})
