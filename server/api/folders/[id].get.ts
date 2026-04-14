import { eq } from 'drizzle-orm'
import { folders, tracks, playlists } from '../../database/schema'
import { db } from '../../database/index'
import { resolveFolderPath } from '../../utils/folders'
import { getFolderImageStatus } from '../../utils/folderImage'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const folder = db.select().from(folders).where(eq(folders.id, id)).get()
  if (! folder) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }

  const children = db.select().from(folders)
    .where(eq(folders.parentId, id))
    .all()
    .sort((first, second) => first.name.localeCompare(second.name))

  const folderTracks = db.select().from(tracks)
    .where(eq(tracks.folderId, id))
    .orderBy(tracks.position)
    .all()

  const playlist = folder.playlistId
    ? db.select().from(playlists).where(eq(playlists.id, folder.playlistId)).get() ?? null
    : null

  const folderPath = await resolveFolderPath(id)
  const imageStatus = await getFolderImageStatus(folderPath)

  return { ...folder, children, tracks: folderTracks, playlist, imageStatus }
})
