<template>
  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-zinc-800 bg-zinc-900 transition-transform md:static md:translate-x-0"
    :class="open ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex items-center gap-2 px-4 py-5">
      <i class="pi pi-headphones text-xl text-emerald-400" />
      <span class="text-lg font-bold tracking-tight">Cache Beat</span>
    </div>
    <nav class="flex flex-1 flex-col gap-1 px-3">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-zinc-800"
        active-class="bg-zinc-800 text-emerald-400"
        @click="$emit('close')"
      >
        <i :class="link.icon" />
        <span>{{ link.label }}</span>
      </NuxtLink>
    </nav>
    <div class="border-t border-zinc-800 px-4 py-3">
      <SyncStatusBadge />
      <p class="mt-2 text-xs text-zinc-600">
        v0.1.0
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
}>()

defineEmits<{
  close: []
}>()

const links = [
  { to: '/', label: 'Dashboard', icon: 'pi pi-home' },
  { to: '/playlists', label: 'Playlists', icon: 'pi pi-list' },
  { to: '/playlists/add', label: 'Add Playlist', icon: 'pi pi-plus' },
  { to: '/settings', label: 'Settings', icon: 'pi pi-cog' },
]
</script>
