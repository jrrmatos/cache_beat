<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Dashboard
      </h1>
      <button
        class="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500 disabled:opacity-50"
        :disabled="syncing"
        @click="triggerSync"
      >
        <i
          class="pi pi-sync"
          :class="{ 'animate-spin': syncing }"
        />
        {{ syncing ? 'Syncing...' : 'Sync All' }}
      </button>
    </div>

    <DownloadProgress />

    <div class="grid grid-cols-3 gap-4">
      <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p class="text-sm text-zinc-400">
          Playlists
        </p>
        <p class="text-2xl font-bold">
          {{ stats.playlists }}
        </p>
      </div>
      <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p class="text-sm text-zinc-400">
          Total Tracks
        </p>
        <p class="text-2xl font-bold">
          {{ stats.totalTracks }}
        </p>
      </div>
      <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p class="text-sm text-zinc-400">
          Downloaded
        </p>
        <p class="text-2xl font-bold text-emerald-400">
          {{ stats.downloaded }}
        </p>
      </div>
    </div>

    <div v-if="recentPlaylists.length">
      <h2 class="mb-3 text-lg font-semibold">
        Playlists
      </h2>
      <div class="grid grid-cols-2 gap-3">
        <PlaylistCard
          v-for="playlist in recentPlaylists"
          :key="playlist.id"
          :playlist="playlist"
        />
      </div>
    </div>

    <div
      v-else
      class="flex flex-col items-center gap-3 py-16 text-zinc-500"
    >
      <i class="pi pi-music text-4xl" />
      <p>No playlists yet</p>
      <NuxtLink
        to="/playlists/add"
        class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
      >
        Add your first playlist
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const { get, post } = useApi()
const { running: syncing, check: checkSync } = useSyncStatus()

interface PlaylistWithCount {
  id: string
  title: string
  thumbnailUrl: string | null
  trackCount: number
  isActive: number
  isCustom: number
  syncFrequency: string
  outputFolder: string | null
  lastSyncedAt: number | null
}

const recentPlaylists = ref<PlaylistWithCount[]>([])
const stats = ref({ playlists: 0, totalTracks: 0, downloaded: 0 })

async function loadData() {
  try {
    const playlistData = await get<PlaylistWithCount[]>('/api/playlists')
    recentPlaylists.value = playlistData

    const allTracks = await get<{ status: string }[]>('/api/tracks')
    stats.value = {
      playlists: playlistData.length,
      totalTracks: allTracks.length,
      downloaded: allTracks.filter(track => track.status === 'completed').length,
    }
  }
  catch {
    // api may not be ready yet
  }
}

async function triggerSync() {
  await post('/api/sync/run')
  checkSync()
  const poll = setInterval(async () => {
    await checkSync()
    if (! syncing.value) {
      clearInterval(poll)
      loadData()
    }
  }, 3000)
}

onMounted(loadData)
</script>
