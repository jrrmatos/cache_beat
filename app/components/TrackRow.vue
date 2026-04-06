<template>
  <div class="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-zinc-800/50 sm:gap-3 sm:px-3">
    <i
      v-if="draggable"
      class="drag-handle pi pi-bars w-4 shrink-0 cursor-grab text-xs text-zinc-600 active:cursor-grabbing"
    />
    <span class="w-6 shrink-0 text-right text-xs text-zinc-500 sm:w-8 sm:text-sm">
      {{ String(track.position + 1).padStart(2, '0') }}
    </span>
    <img
      v-if="track.thumbnailUrl"
      :src="track.thumbnailUrl"
      :alt="track.title"
      class="h-8 w-8 shrink-0 rounded object-cover sm:h-10 sm:w-10"
    >
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium">
        {{ track.title }}
      </p>
      <div class="flex items-center gap-1.5">
        <p
          v-if="track.artist"
          class="truncate text-xs text-zinc-400"
        >
          {{ track.artist }}
        </p>
        <span
          class="inline-block shrink-0 rounded px-1.5 py-0.5 text-xs sm:hidden"
          :class="statusClass"
        >
          {{ track.status }}
        </span>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-1 sm:gap-2">
      <span
        v-if="track.overrideUrl"
        class="hidden rounded bg-purple-900/50 px-2 py-0.5 text-xs text-purple-300 sm:inline"
        :title="`Override: ${track.overrideUrl}`"
      >
        override
      </span>
      <span
        v-if="track.removedFromSource"
        class="hidden rounded bg-amber-900/50 px-2 py-0.5 text-xs text-amber-300 sm:inline"
        title="Removed from YouTube playlist"
      >
        removed
      </span>
      <span
        class="hidden rounded px-2 py-0.5 text-xs sm:inline"
        :class="statusClass"
        :title="track.errorMessage ?? undefined"
      >
        {{ track.status }}
      </span>
      <span
        v-if="track.status === 'failed' && track.errorMessage"
        class="hidden max-w-xs truncate text-xs text-red-400 sm:inline"
        :title="track.errorMessage"
      >
        {{ track.errorMessage }}
      </span>
      <button
        v-if="track.status === 'failed'"
        class="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
        title="Retry download"
        @click="$emit('retry', track.id)"
      >
        <i class="pi pi-refresh text-xs" />
      </button>
      <button
        class="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
        title="Edit track URL"
        @click="$emit('edit', track.id)"
      >
        <i class="pi pi-pencil text-xs" />
      </button>
      <button
        v-if="track.status !== 'downloading'"
        class="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
        :title="track.status === 'completed' ? 'Force re-download' : 'Download now'"
        @click="$emit('download', track.id, track.status === 'completed')"
      >
        <i class="pi pi-download text-xs" />
      </button>
      <button
        v-if="deletable"
        class="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-red-400"
        title="Remove track"
        @click="$emit('delete', track.id)"
      >
        <i class="pi pi-trash text-xs" />
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
    errorMessage: string | null
    overrideUrl: string | null
    removedFromSource: number
  }
  deletable?: boolean
  draggable?: boolean
}>()

defineEmits<{
  retry: [trackId: string]
  download: [trackId: string, force: boolean]
  edit: [trackId: string]
  delete: [trackId: string]
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
