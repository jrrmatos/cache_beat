<template>
  <aside
    class="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-zinc-800 bg-zinc-900 transition-transform md:static md:translate-x-0"
    :class="open ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="flex items-center gap-2 px-4 py-5">
      <i class="pi pi-headphones text-xl text-emerald-400" />
      <span class="text-lg font-bold tracking-tight">Cache Beat</span>
    </div>
    <nav class="flex flex-col gap-1 px-3">
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

    <div class="mt-4 border-t border-zinc-800 px-3 pt-3">
      <div class="mb-2 flex items-center justify-between px-2">
        <span class="text-xs font-medium uppercase tracking-wider text-zinc-500">Folders</span>
        <div class="flex gap-1">
          <button
            class="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            title="Sync folders from disk"
            :disabled="syncing"
            @click="syncFolders"
          >
            <i
              class="pi pi-sync text-xs"
              :class="{ 'animate-spin': syncing }"
            />
          </button>
          <button
            class="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            title="New folder"
            @click="showNewFolder = true"
          >
            <i class="pi pi-plus text-xs" />
          </button>
        </div>
      </div>

      <div
        v-if="showNewFolder"
        class="mb-2 flex gap-1 px-2"
      >
        <input
          ref="newFolderInput"
          v-model="newFolderName"
          type="text"
          placeholder="Folder name"
          class="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none"
          @keydown.enter="createFolder"
          @keydown.escape="showNewFolder = false"
        >
        <button
          class="shrink-0 rounded bg-emerald-600 px-2 py-1 text-xs hover:bg-emerald-500"
          @click="createFolder"
        >
          <i class="pi pi-check text-xs" />
        </button>
      </div>

      <div class="max-h-[calc(100vh-370px)] overflow-y-auto">
        <FolderTree
          v-if="folderTree.length"
          :folders="folderTree"
          :depth="0"
          :active-id="activeFolderId"
          :expanded="expandedFolders"
          @select="navigateToFolder"
          @toggle="toggleFolder"
        />
        <p
          v-else
          class="px-2 text-xs text-zinc-600"
        >
          No folders yet
        </p>
      </div>
    </div>

    <div class="mt-auto border-t border-zinc-800 px-4 py-3">
      <SyncStatusBadge />
      <p class="mt-2 text-xs text-zinc-600">
        v0.3.1
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { post } = useApi()
const route = useRoute()
const router = useRouter()
const { tree: folderTree, load: loadFolderTree } = useFolderTree()

const links = [
  { to: '/', label: 'Dashboard', icon: 'pi pi-home' },
  { to: '/playlists', label: 'Playlists', icon: 'pi pi-list' },
  { to: '/playlists/add', label: 'Add Playlist', icon: 'pi pi-plus' },
  { to: '/settings', label: 'Settings', icon: 'pi pi-cog' },
]

const expandedFolders = ref(new Set<string>())
const showNewFolder = ref(false)
const syncing = ref(false)
const newFolderName = ref('')
const newFolderInput = ref<HTMLInputElement | null>(null)

const activeFolderId = computed(() => {
  if (route.path.startsWith('/folders/')) {
    return route.params.id as string
  }
  return null
})

function toggleFolder(id: string) {
  const next = new Set(expandedFolders.value)
  if (next.has(id)) {
    next.delete(id)
  }
  else {
    next.add(id)
  }
  expandedFolders.value = next
}

function navigateToFolder(id: string) {
  router.push(`/folders/${id}`)
  emit('close')
}

async function syncFolders() {
  syncing.value = true
  try {
    await post('/api/folders/sync', {})
    await loadFolderTree()
  }
  finally {
    syncing.value = false
  }
}

async function createFolder() {
  const name = newFolderName.value.trim()
  if (! name) {
    return
  }
  await post('/api/folders', { name })
  newFolderName.value = ''
  showNewFolder.value = false
  await loadFolderTree()
}

watch(showNewFolder, async (value) => {
  if (value) {
    await nextTick()
    newFolderInput.value?.focus()
  }
})

onMounted(loadFolderTree)

// Refresh tree when navigating
watch(() => route.path, loadFolderTree)
</script>
