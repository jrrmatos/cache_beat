import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const FOLDER_IMAGE_NAME = 'Folder.jpg'
export type FolderImageStatus = 'missing' | 'placeholder' | 'custom'

let cachedPlaceholder: Buffer | null = null

export async function getPlaceholderBytes(): Promise<Buffer> {
  if (cachedPlaceholder) {
    return cachedPlaceholder
  }
  const storage = useStorage('assets:public')
  const raw = await storage.getItemRaw('placeholder.jpg')
  if (! raw) {
    throw createError({ statusCode: 500, message: 'placeholder.jpg not found in server assets' })
  }
  cachedPlaceholder = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer)
  return cachedPlaceholder
}

export async function getFolderImageStatus(folderPath: string): Promise<FolderImageStatus> {
  const imagePath = join(folderPath, FOLDER_IMAGE_NAME)
  if (! existsSync(imagePath) || ! statSync(imagePath).isFile()) {
    return 'missing'
  }
  const [placeholder, existing] = [await getPlaceholderBytes(), readFileSync(imagePath)]
  return placeholder.equals(existing) ? 'placeholder' : 'custom'
}

export async function writePlaceholderImage(folderPath: string): Promise<void> {
  if (! existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true })
  }
  const bytes = await getPlaceholderBytes()
  writeFileSync(join(folderPath, FOLDER_IMAGE_NAME), bytes)
}
