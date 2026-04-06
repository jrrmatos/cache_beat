interface DownloadProgress {
  trackId: string
  percentage: string
  speed: string
  eta: string
}

export function useDownloadProgress() {
  const current = ref<DownloadProgress | null>(null)
  let eventSource: EventSource | null = null

  onMounted(() => {
    eventSource = new EventSource('/api/downloads/progress')
    eventSource.onmessage = (event) => {
      current.value = JSON.parse(event.data)
    }
    eventSource.onerror = () => {
      current.value = null
    }
  })

  onUnmounted(() => {
    if (eventSource) {
      eventSource.close()
    }
  })

  return { current }
}
