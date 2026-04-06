import { syncPlaylist, downloadPendingTracks } from '../../../utils/sync'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const syncResult = await syncPlaylist(id)
  const downloadResult = await downloadPendingTracks(id)

  return {
    ...syncResult,
    downloaded: downloadResult.downloaded,
    failed: downloadResult.failed,
  }
})
