import { existsSync, mkdirSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { YtDlp } from 'ytdlp-nodejs'

const ytdlp = new YtDlp()

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

export async function downloadTrack(
  videoId: string,
  outputDir: string,
  position: number,
  title: string,
  trackId: string,
  audioQuality = '0',
): Promise<string> {
  if (! existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const paddedPosition = String(position + 1).padStart(2, '0')
  const sanitizedTitle = sanitizeFilename(title)
  const filename = `${paddedPosition} - ${sanitizedTitle}`
  const url = `https://www.youtube.com/watch?v=${videoId}`

  await ytdlp
    .download(url)
    .extractAudio()
    .audioFormat('mp3')
    .audioQuality(audioQuality)
    .output(outputDir)
    .setOutputTemplate(`${filename}.%(ext)s`)
    .on('progress', (progress) => {
      downloadEmitter.emit('progress', {
        trackId,
        percentage: progress.percentage_str ?? '0%',
        speed: progress.speed_str ?? '',
        eta: progress.eta_str ?? '',
      } satisfies DownloadProgress)
    })
    .run()

  return `${outputDir}/${filename}.mp3`
}
