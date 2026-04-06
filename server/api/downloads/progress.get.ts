import { downloadEmitter, type DownloadProgress } from '../../utils/downloader'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      const onProgress = (progress: DownloadProgress) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`))
      }

      downloadEmitter.on('progress', onProgress)

      event.node.req.on('close', () => {
        downloadEmitter.off('progress', onProgress)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
})
