export interface FolderTreeNode {
  id: string
  name: string
  playlistId: string | null
  trackCount: number
  children: FolderTreeNode[]
}

export function useFolderTree() {
  const tree = useState<FolderTreeNode[]>('folder-tree', () => [])
  const { get } = useApi()

  async function load() {
    tree.value = await get<FolderTreeNode[]>('/api/folders/tree')
  }

  return { tree, load }
}
