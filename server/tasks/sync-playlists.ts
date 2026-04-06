import { runFullSync } from '../utils/sync'

export default defineTask({
  meta: {
    name: 'sync:playlists',
    description: 'Sync all active playlists and download pending tracks',
  },
  async run() {
    await runFullSync()
    return { result: 'ok' }
  },
})
