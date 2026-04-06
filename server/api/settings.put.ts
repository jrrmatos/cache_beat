import { z } from 'zod/v4'
import { deleteSetting, setSetting } from '../utils/settings'

const bodySchema = z.object({
  youtube_client_id: z.string().optional(),
  youtube_client_secret: z.string().optional(),
  default_output_path: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) {
      continue
    }
    if (value === '') {
      await deleteSetting(key)
    }
    else {
      await setSetting(key, value)
    }
  }

  return { ok: true }
})
