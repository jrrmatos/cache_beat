<template>
  <div class="flex items-center justify-center py-16">
    <i class="pi pi-spin pi-spinner text-2xl text-zinc-400" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { get } = useApi()

onMounted(async () => {
  try {
    const data = await get<{ folderId: string | null }>(`/api/playlists/${route.params.id}`)
    if (data.folderId) {
      router.replace(`/folders/${data.folderId}`)
    }
    else {
      router.replace('/playlists')
    }
  }
  catch {
    router.replace('/playlists')
  }
})
</script>
