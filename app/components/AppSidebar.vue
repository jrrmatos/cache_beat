<template>
  <aside class="flex w-56 flex-col border-r border-zinc-800 bg-zinc-900">
    <div class="flex items-center gap-2 px-4 py-5">
      <i class="pi pi-headphones text-xl text-emerald-400" />
      <span class="text-lg font-bold tracking-tight">cache_beat</span>
    </div>
    <nav class="flex flex-1 flex-col gap-1 px-3">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-zinc-800"
        active-class="bg-zinc-800 text-emerald-400"
      >
        <i :class="link.icon" />
        <span>{{ link.label }}</span>
      </NuxtLink>
    </nav>
    <div class="border-t border-zinc-800 px-4 py-3">
      <SyncStatusBadge />
    </div>
  </aside>
</template>

<script setup lang="ts">
const links = [
  { to: '/', label: 'Dashboard', icon: 'pi pi-home' },
  { to: '/playlists', label: 'Playlists', icon: 'pi pi-list' },
  { to: '/playlists/add', label: 'Add Playlist', icon: 'pi pi-plus' },
  { to: '/settings', label: 'Settings', icon: 'pi pi-cog' },
]
</script>
