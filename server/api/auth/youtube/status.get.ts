import { isYoutubeConnected } from '../../../utils/youtube'

export default defineEventHandler(async () => {
  const connected = await isYoutubeConnected()
  return { connected }
})
