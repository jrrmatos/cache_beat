<template>
  <div class="flex h-screen bg-zinc-950 text-zinc-100">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto p-6">
      <slot />
    </main>
  </div>
</template>
