<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Playlists
      </h1>
      <NuxtLink
        to="/playlists/add"
        class="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500"
      >
        <i class="pi pi-plus" />
        Add Playlist
      </NuxtLink>
    </div>

    <div
      v-if="playlists.length"
      class="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <PlaylistCard
        v-for="playlist in playlists"
        :key="playlist.id"
        :playlist="playlist"
      />
    </div>

    <div
      v-else
      class="flex flex-col items-center gap-3 py-16 text-zinc-500"
    >
      <i class="pi pi-list text-4xl" />
      <p>No playlists tracked yet</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { get } = useApi()

interface PlaylistWithCount {
  id: string
  folderId: string | null
  title: string
  thumbnailUrl: string | null
  trackCount: number
  isActive: number
  isCustom: number
  syncFrequency: string
  lastSyncedAt: number | null
}

const playlists = ref<PlaylistWithCount[]>([])

onMounted(async () => {
  try {
    playlists.value = await get<PlaylistWithCount[]>('/api/playlists')
  }
  catch {
    // api may not be ready
  }
})
</script>
