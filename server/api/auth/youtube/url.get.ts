import { getAuthUrl } from '../../../utils/youtube'

export default defineEventHandler(async () => {
  const url = await getAuthUrl()
  return { url }
})
