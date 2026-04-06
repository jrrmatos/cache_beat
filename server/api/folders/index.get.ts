import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod/v4'
import { getSetting } from '../../utils/settings'

const querySchema = z.object({
  path: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { path: subPath } = await getValidatedQuery(event, querySchema.parse)
  const defaultPath = await getSetting('default_output_path')
  if (! defaultPath || ! existsSync(defaultPath)) {
    return { basePath: defaultPath, folders: [] }
  }

  const targetPath = subPath ? resolve(defaultPath, subPath) : defaultPath
  if (! targetPath.startsWith(resolve(defaultPath)) || ! existsSync(targetPath)) {
    return { basePath: defaultPath, folders: [] }
  }

  const entries = readdirSync(targetPath)
  const folders = entries
    .filter((entry) => {
      try {
        return statSync(resolve(targetPath, entry)).isDirectory()
      }
      catch {
        return false
      }
    })
    .sort()

  return { basePath: defaultPath, folders }
})
