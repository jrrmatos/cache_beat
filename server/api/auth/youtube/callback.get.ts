import { z } from 'zod/v4'
import { exchangeCode } from '../../../utils/youtube'

const querySchema = z.object({
  code: z.string(),
})

export default defineEventHandler(async (event) => {
  const { code } = await getValidatedQuery(event, querySchema.parse)
  await exchangeCode(code)
  return sendRedirect(event, '/settings?youtube=connected')
})
