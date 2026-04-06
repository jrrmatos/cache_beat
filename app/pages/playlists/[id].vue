<template>
  <div
    v-if="playlist"
    class="space-y-6"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button
          class="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          @click="$router.back()"
        >
          <i class="pi pi-arrow-left" />
        </button>
        <div>
          <h1 class="text-2xl font-bold">
            {{ playlist.title }}
          </h1>
          <p class="text-sm text-zinc-400">
            {{ playlist.tracks.length }} tracks
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-2 rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-900/30"
          @click="confirmDelete"
        >
          <i class="pi pi-trash" />
          Delete
        </button>
        <button
          class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm transition-colors hover:bg-zinc-800"
          @click="showConfig = ! showConfig"
        >
          <i class="pi pi-cog" />
          Config
        </button>
        <button
          class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm transition-colors hover:bg-zinc-800 disabled:opacity-50"
          :disabled="syncingMetadata"
          @click="syncMetadata"
        >
          <i
            class="pi pi-sync"
            :class="{ 'animate-spin': syncingMetadata }"
          />
          Sync Metadata
        </button>
        <button
          class="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500 disabled:opacity-50"
          :disabled="syncingFiles"
          @click="syncFiles"
        >
          <i
            class="pi pi-download"
            :class="{ 'animate-pulse': syncingFiles }"
          />
          {{ syncingFiles ? 'Downloading...' : 'Download Files' }}
        </button>
      </div>
    </div>

    <DownloadProgress />

    <div
      v-if="showConfig"
      class="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
    >
      <h2 class="mb-4 font-semibold">
        Playlist Configuration
      </h2>
      <PlaylistConfigForm v-model="configForm" />
      <div class="mt-4 flex items-center gap-3">
        <button
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500"
          @click="saveConfig"
        >
          Save
        </button>
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="isActive"
            type="checkbox"
            class="rounded"
          >
          Active
        </label>
      </div>
    </div>

    <div class="rounded-xl border border-zinc-800">
      <TrackRow
        v-for="track in playlist.tracks"
        :key="track.id"
        :track="track"
        @retry="retryTrack"
        @download="downloadTrack"
      />
      <div
        v-if="! playlist.tracks.length"
        class="p-8 text-center text-zinc-500"
      >
        No tracks yet. Hit "Sync Metadata" to fetch from YouTube.
      </div>
    </div>
  </div>

  <div
    v-else
    class="flex items-center justify-center py-16"
  >
    <i class="pi pi-spin pi-spinner text-2xl text-zinc-400" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { get, post, put, del } = useApi()

interface Track {
  id: string
  position: number
  title: string
  artist: string | null
  thumbnailUrl: string | null
  status: string
  errorMessage: string | null
  removedFromSource: number
}

interface PlaylistDetail {
  id: string
  title: string
  outputPath: string | null
  syncFrequency: string
  audioQuality: string
  isActive: number
  tracks: Track[]
}

const playlist = ref<PlaylistDetail | null>(null)
const syncingMetadata = ref(false)
const syncingFiles = ref(false)
const showConfig = ref(false)
const configForm = ref({
  outputPath: null as string | null,
  syncFrequency: 'daily',
  audioQuality: '0',
})
const isActive = ref(true)
let pollInterval: ReturnType<typeof setInterval> | null = null

function hasActiveDownloads(): boolean {
  if (! playlist.value) {
    return false
  }
  return playlist.value.tracks.some(track =>
    track.status === 'downloading' || (track.status === 'pending' && syncingFiles.value),
  )
}

function startPolling() {
  if (pollInterval) {
    return
  }
  pollInterval = setInterval(async () => {
    await loadPlaylist()
    if (! hasActiveDownloads()) {
      stopPolling()
    }
  }, 2000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

async function loadPlaylist() {
  const data = await get<PlaylistDetail>(`/api/playlists/${route.params.id}`)
  playlist.value = data
  configForm.value = {
    outputPath: data.outputPath,
    syncFrequency: data.syncFrequency,
    audioQuality: data.audioQuality,
  }
  isActive.value = !! data.isActive

  if (data.tracks.some(track => track.status === 'downloading')) {
    startPolling()
  }
}

async function syncMetadata() {
  syncingMetadata.value = true
  try {
    await post(`/api/playlists/${route.params.id}/sync?type=metadata`)
    await loadPlaylist()
  }
  catch (error) {
    console.error('Metadata sync failed:', error)
  }
  finally {
    syncingMetadata.value = false
  }
}

async function syncFiles() {
  syncingFiles.value = true
  try {
    await post(`/api/playlists/${route.params.id}/sync?type=files`)
    await loadPlaylist()
    startPolling()
  }
  catch (error) {
    console.error('File sync failed:', error)
  }
  finally {
    syncingFiles.value = false
  }
}

async function saveConfig() {
  await put(`/api/playlists/${route.params.id}`, {
    ...configForm.value,
    isActive: isActive.value ? 1 : 0,
  })
  await loadPlaylist()
  showConfig.value = false
}

async function confirmDelete() {
  if (! confirm('Delete this playlist? Downloaded files will be kept.')) {
    return
  }
  await del(`/api/playlists/${route.params.id}`)
  router.push('/playlists')
}

async function retryTrack(trackId: string) {
  await post(`/api/tracks/${trackId}/retry`)
  await loadPlaylist()
  startPolling()
}

async function downloadTrack(trackId: string, force: boolean) {
  await post(`/api/tracks/${trackId}/download?force=${force}`)
  await loadPlaylist()
  startPolling()
}

onMounted(loadPlaylist)

onUnmounted(stopPolling)
</script>
