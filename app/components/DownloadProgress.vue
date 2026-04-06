<template>
  <div
    v-if="current"
    class="flex items-center gap-3 rounded-lg bg-zinc-800 px-4 py-2 text-sm"
  >
    <i class="pi pi-download text-emerald-400 animate-pulse" />
    <span class="flex-1">Downloading...</span>
    <span class="text-zinc-400">{{ current.percentage }}</span>
    <span
      v-if="current.speed"
      class="text-zinc-500"
    >
      {{ current.speed }}
    </span>
  </div>
</template>

<script setup lang="ts">
const { current } = useDownloadProgress()
</script>
