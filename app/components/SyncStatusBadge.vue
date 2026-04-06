<template>
  <div class="flex items-center gap-2 text-xs text-zinc-400">
    <span
      class="inline-block h-2 w-2 rounded-full"
      :class="running ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'"
    />
    <span>{{ running ? 'Syncing...' : 'Idle' }}</span>
  </div>
</template>

<script setup lang="ts">
const { running } = useSyncStatus()
</script>
