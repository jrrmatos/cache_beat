import { count } from 'drizzle-orm'
import { folders, tracks } from '../../database/schema'
import { db } from '../../database/index'

interface FolderNode {
  id: string
  name: string
  parentId: string | null
  playlistId: string | null
  trackCount: number
  children: FolderNode[]
}

export default defineEventHandler(async () => {
  const allFolders = db.select().from(folders).all()

  const trackCounts = db.select({
    folderId: tracks.folderId,
    count: count(),
  }).from(tracks).groupBy(tracks.folderId).all()

  const countMap = new Map(trackCounts.map(row => [row.folderId, row.count]))

  const nodeMap = new Map<string, FolderNode>()
  for (const folder of allFolders) {
    nodeMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      playlistId: folder.playlistId,
      trackCount: countMap.get(folder.id) ?? 0,
      children: [],
    })
  }

  const roots: FolderNode[] = []
  for (const node of nodeMap.values()) {
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId)
      if (parent) {
        parent.children.push(node)
      }
      else {
        roots.push(node)
      }
    }
    else {
      roots.push(node)
    }
  }

  roots.sort((first, second) => first.name.localeCompare(second.name))
  for (const node of nodeMap.values()) {
    node.children.sort((first, second) => first.name.localeCompare(second.name))
  }

  return roots
})
