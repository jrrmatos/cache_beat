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
          class="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm transition-colors hover:bg-zinc-800"
          @click="showConfig = ! showConfig"
        >
          <i class="pi pi-cog" />
          Config
        </button>
        <button
          class="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500 disabled:opacity-50"
          :disabled="syncing"
          @click="syncPlaylist"
        >
          <i
            class="pi pi-sync"
            :class="{ 'animate-spin': syncing }"
          />
          {{ syncing ? 'Syncing...' : 'Sync Now' }}
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
      />
      <div
        v-if="! playlist.tracks.length"
        class="p-8 text-center text-zinc-500"
      >
        No tracks yet. Hit "Sync Now" to fetch from YouTube.
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
const { get, post, put } = useApi()

interface Track {
  id: string
  position: number
  title: string
  artist: string | null
  thumbnailUrl: string | null
  status: string
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
const syncing = ref(false)
const showConfig = ref(false)
const configForm = ref({
  outputPath: null as string | null,
  syncFrequency: 'daily',
  audioQuality: '0',
})
const isActive = ref(true)

async function loadPlaylist() {
  const data = await get<PlaylistDetail>(`/api/playlists/${route.params.id}`)
  playlist.value = data
  configForm.value = {
    outputPath: data.outputPath,
    syncFrequency: data.syncFrequency,
    audioQuality: data.audioQuality,
  }
  isActive.value = !! data.isActive
}

async function syncPlaylist() {
  syncing.value = true
  try {
    await post(`/api/playlists/${route.params.id}/sync`)
    await loadPlaylist()
  }
  catch (error) {
    console.error('Sync failed:', error)
  }
  finally {
    syncing.value = false
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

async function retryTrack(trackId: string) {
  await post(`/api/tracks/${trackId}/retry`)
  await loadPlaylist()
}

onMounted(loadPlaylist)
</script>
