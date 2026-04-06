<template>
  <NuxtLink
    :to="`/playlists/${playlist.id}`"
    class="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
  >
    <img
      v-if="playlist.thumbnailUrl"
      :src="playlist.thumbnailUrl"
      :alt="playlist.title"
      class="h-20 w-20 rounded-lg object-cover"
    >
    <div
      v-else
      class="flex h-20 w-20 items-center justify-center rounded-lg bg-zinc-800"
    >
      <i class="pi pi-music text-2xl text-zinc-500" />
    </div>
    <div class="flex min-w-0 flex-1 flex-col justify-between">
      <div>
        <h3 class="truncate font-medium">
          {{ playlist.title }}
        </h3>
        <p class="text-sm text-zinc-400">
          {{ playlist.trackCount }} tracks
        </p>
      </div>
      <div class="flex items-center gap-2 text-xs text-zinc-500">
        <span
          class="inline-block h-1.5 w-1.5 rounded-full"
          :class="playlist.isActive ? 'bg-emerald-400' : 'bg-zinc-600'"
        />
        <span>{{ playlist.syncFrequency }}</span>
        <span v-if="playlist.lastSyncedAt">
          &middot; synced {{ timeAgo(playlist.lastSyncedAt) }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  playlist: {
    id: string
    title: string
    thumbnailUrl: string | null
    trackCount: number
    isActive: number
    syncFrequency: string
    lastSyncedAt: number | null
  }
}>()

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) {
    return 'just now'
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`
  }
  return `${Math.floor(seconds / 86400)}d ago`
}
</script>
