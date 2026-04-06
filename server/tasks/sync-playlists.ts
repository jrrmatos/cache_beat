import { runMetadataSync } from '../utils/sync'

export default defineTask({
  meta: {
    name: 'sync:playlists',
    description: 'Sync playlist metadata from YouTube',
  },
  async run() {
    await runMetadataSync()
    return { result: 'ok' }
  },
})
