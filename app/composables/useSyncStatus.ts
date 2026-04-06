export function useSyncStatus() {
  const running = ref(false)
  let interval: ReturnType<typeof setInterval> | null = null

  async function check() {
    try {
      const data = await $fetch<{ running: boolean }>('/api/sync/status')
      running.value = data.running
    }
    catch {
      running.value = false
    }
  }

  onMounted(() => {
    check()
    interval = setInterval(check, 5000)
  })

  onUnmounted(() => {
    if (interval) {
      clearInterval(interval)
    }
  })

  return { running, check }
}
