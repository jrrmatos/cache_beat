<template>
  <div class="flex h-screen bg-zinc-950 text-zinc-100">
    <AppSidebar
      :open="sidebarOpen"
      @close="sidebarOpen = false"
    />
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 bg-black/60 md:hidden"
      @click="sidebarOpen = false"
    />
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex items-center gap-3 border-b border-zinc-800 px-4 py-3 md:hidden">
        <button
          class="rounded-lg p-1 text-zinc-400 hover:text-white"
          @click="sidebarOpen = true"
        >
          <i class="pi pi-bars text-lg" />
        </button>
        <span class="font-bold tracking-tight">Cache Beat</span>
      </header>
      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const sidebarOpen = ref(false)
const route = useRoute()

watch(() => route.path, () => {
  sidebarOpen.value = false
})
</script>
