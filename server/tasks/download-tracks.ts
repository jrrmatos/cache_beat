import { runFileSync } from '../utils/sync'

export default defineTask({
  meta: {
    name: 'sync:downloads',
    description: 'Download missing track files',
  },
  async run() {
    await runFileSync()
    return { result: 'ok' }
  },
})
