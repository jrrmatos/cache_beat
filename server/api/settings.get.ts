import { getSetting } from '../utils/settings'

const SETTING_KEYS = [
  'youtube_client_id',
  'youtube_client_secret',
  'default_output_path',
] as const

export default defineEventHandler(async () => {
  const result: Record<string, string | null> = {}
  for (const key of SETTING_KEYS) {
    const value = await getSetting(key)
    if (key.includes('secret') || key.includes('token')) {
      result[key] = value ? '••••••••' : null
    }
    else {
      result[key] = value
    }
  }
  return result
})
