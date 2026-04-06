import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod/v4'
import { getSetting } from '../../utils/settings'

const bodySchema = z.object({
  name: z.string().min(1).max(200),
})

export default defineEventHandler(async (event) => {
  const { name } = await readValidatedBody(event, bodySchema.parse)

  if (/[<>:"/\\|?*]/.test(name) || name.includes('..')) {
    throw createError({ statusCode: 400, message: 'Invalid folder name' })
  }

  const defaultPath = await getSetting('default_output_path')
  if (! defaultPath) {
    throw createError({ statusCode: 400, message: 'Default output path not configured' })
  }

  const folderPath = resolve(defaultPath, name)
  if (! folderPath.startsWith(resolve(defaultPath))) {
    throw createError({ statusCode: 400, message: 'Invalid folder name' })
  }

  if (! existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true })
  }

  return { name, path: folderPath }
})
