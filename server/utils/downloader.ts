import { existsSync, mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'

export interface DownloadProgress {
  trackId: string
  percentage: string
  speed: string
  eta: string
}

export const downloadEmitter = new EventEmitter()

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

const PROGRESS_RE = /\[download\]\s+([\d.]+%)\s+of.*?at\s+(\S+)\s+ETA\s+(\S+)/

function parseProgress(line: string): { percentage: string, speed: string, eta: string } | null {
  const match = PROGRESS_RE.exec(line)
  if (! match) {
    return null
  }
  return { percentage: match[1], speed: match[2], eta: match[3] }
}

export async function downloadTrack(
  videoId: string,
  outputDir: string,
  position: number,
  title: string,
  trackId: string,
  audioQuality = '0',
  overrideUrl?: string | null,
): Promise<string> {
  if (! existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const paddedPosition = String(position + 1).padStart(2, '0')
  const sanitizedTitle = sanitizeFilename(title)
  const filename = `${paddedPosition} - ${sanitizedTitle}`
  const url = overrideUrl || `https://www.youtube.com/watch?v=${videoId}`

  const args = [
    '--extract-audio',
    '--audio-format', 'mp3',
    '--audio-quality', audioQuality,
    '--output', `${outputDir}/${filename}.%(ext)s`,
    '--no-playlist',
    '--newline',
    url,
  ]

  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args)
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n')
      for (const line of lines) {
        const progress = parseProgress(line)
        if (progress) {
          downloadEmitter.emit('progress', { trackId, ...progress } satisfies DownloadProgress)
        }
      }
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(`${outputDir}/${filename}.mp3`)
      }
      else {
        reject(new Error(`yt-dlp exited with code ${code}: ${stderr.trim() || 'Unknown error'}`))
      }
    })

    proc.on('error', (error) => {
      reject(new Error(`Failed to spawn yt-dlp: ${error.message}`))
    })
  })
}
