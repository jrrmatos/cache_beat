<template>
  <div class="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-800/50">
    <span class="w-8 text-right text-sm text-zinc-500">
      {{ String(track.position + 1).padStart(2, '0') }}
    </span>
    <img
      v-if="track.thumbnailUrl"
      :src="track.thumbnailUrl"
      :alt="track.title"
      class="h-10 w-10 rounded object-cover"
    >
    <div
      v-else
      class="flex h-10 w-10 items-center justify-center rounded bg-zinc-800"
    >
      <i class="pi pi-music text-xs text-zinc-500" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium">
        {{ track.title }}
      </p>
      <p
        v-if="track.artist"
        class="truncate text-xs text-zinc-400"
      >
        {{ track.artist }}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <span
        v-if="track.removedFromSource"
        class="rounded bg-amber-900/50 px-2 py-0.5 text-xs text-amber-300"
        title="Removed from YouTube playlist"
      >
        removed
      </span>
      <span
        class="rounded px-2 py-0.5 text-xs"
        :class="statusClass"
      >
        {{ track.status }}
      </span>
      <button
        v-if="track.status === 'failed'"
        class="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
        title="Retry download"
        @click="$emit('retry', track.id)"
      >
        <i class="pi pi-refresh text-xs" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  track: {
    id: string
    position: number
    title: string
    artist: string | null
    thumbnailUrl: string | null
    status: string
    removedFromSource: number
  }
}>()

defineEmits<{
  retry: [trackId: string]
}>()

const statusClass = computed(() => {
  switch (props.track.status) {
    case 'completed': return 'bg-emerald-900/50 text-emerald-300'
    case 'downloading': return 'bg-blue-900/50 text-blue-300'
    case 'pending': return 'bg-zinc-800 text-zinc-400'
    case 'failed': return 'bg-red-900/50 text-red-300'
    default: return 'bg-zinc-800 text-zinc-400'
  }
})
</script>
