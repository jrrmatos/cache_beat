import { z } from 'zod/v4'
import { downloadSingleTrack } from '../../../utils/sync'

const querySchema = z.object({
  force: z.coerce.boolean().default(false),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const { force } = await getValidatedQuery(event, querySchema.parse)

  downloadSingleTrack(id, force).catch((error) => {
    console.error(`[download] single track ${id} failed:`, error)
  })

  return { ok: true }
})
