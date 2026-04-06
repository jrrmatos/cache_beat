import { z } from 'zod/v4'
import { searchVideos } from '../../utils/youtube'

const querySchema = z.object({
  q: z.string().min(1),
  pageToken: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { q, pageToken } = await getValidatedQuery(event, querySchema.parse)
  return await searchVideos(q, pageToken)
})
