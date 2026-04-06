<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">
      Add Playlist
    </h1>

    <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 class="mb-4 text-lg font-semibold">
        Create Custom Playlist
      </h2>
      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-sm text-zinc-400">Title</label>
          <input
            v-model="customTitle"
            type="text"
            placeholder="My Playlist"
            class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
        </div>
        <PlaylistConfigForm
          v-model="customConfigForm"
          :hide-sync="true"
        />
        <button
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500 disabled:opacity-50"
          :disabled="! customTitle.trim()"
          @click="createCustom"
        >
          Create Playlist
        </button>
      </div>
    </div>

    <div
      v-if="! connected"
      class="rounded-xl border border-amber-800 bg-amber-900/20 p-4 text-sm text-amber-300"
    >
      <p>
        YouTube is not connected. Go to <NuxtLink
          to="/settings"
          class="underline"
        >Settings</NuxtLink> to connect and import YouTube playlists.
      </p>
    </div>

    <template v-else>
      <div
        v-if="loading"
        class="flex items-center gap-2 text-zinc-400"
      >
        <i class="pi pi-spin pi-spinner" />
        Loading playlists...
      </div>

      <div
        v-if="youtubePlaylists.length"
        class="space-y-3"
      >
        <h2 class="text-lg font-semibold">
          Your YouTube Playlists
        </h2>
        <div
          v-for="playlist in youtubePlaylists"
          :key="playlist.id"
          class="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
        >
          <img
            v-if="playlist.thumbnail"
            :src="playlist.thumbnail"
            :alt="playlist.title"
            class="h-16 w-16 rounded-lg object-cover"
          >
          <div class="min-w-0 flex-1">
            <h3 class="truncate font-medium">
              {{ playlist.title }}
            </h3>
            <p class="text-sm text-zinc-400">
              {{ playlist.itemCount }} items
            </p>
          </div>
          <button
            v-if="! addedIds.has(playlist.youtubeId)"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500"
            @click="startAdd(playlist)"
          >
            Add
          </button>
          <span
            v-else
            class="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-400"
          >
            Added
          </span>
        </div>
      </div>

      <div
        v-if="addingPlaylist"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        @click.self="addingPlaylist = null"
      >
        <div class="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6">
          <h2 class="mb-4 text-lg font-semibold">
            Configure "{{ addingPlaylist.title }}"
          </h2>
          <PlaylistConfigForm v-model="configForm" />
          <div class="mt-6 flex justify-end gap-3">
            <button
              class="rounded-lg px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800"
              @click="addingPlaylist = null"
            >
              Cancel
            </button>
            <button
              class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500"
              @click="confirmAdd"
            >
              Add & Sync
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const { get, post } = useApi()

interface YoutubePlaylist {
  youtubeId: string
  title: string
  thumbnail: string | null
  itemCount: number
  id: string
}

const connected = ref(false)
const loading = ref(false)
const youtubePlaylists = ref<YoutubePlaylist[]>([])
const addedIds = ref(new Set<string>())
const addingPlaylist = ref<YoutubePlaylist | null>(null)
const configForm = ref({
  outputFolder: null as string | null,
  syncFrequency: 'daily',
  audioQuality: '0',
})

const customTitle = ref('')
const customConfigForm = ref({
  outputFolder: null as string | null,
  syncFrequency: 'manual',
  audioQuality: '0',
})

async function createCustom() {
  if (! customTitle.value.trim()) {
    return
  }
  try {
    const data = await post<{ id: string }>('/api/playlists/custom', {
      title: customTitle.value.trim(),
      outputFolder: customConfigForm.value.outputFolder,
      audioQuality: customConfigForm.value.audioQuality,
    })
    router.push(`/playlists/${data.id}`)
  }
  catch (error) {
    console.error('Failed to create custom playlist:', error)
  }
}

async function checkConnection() {
  try {
    const status = await get<{ connected: boolean }>('/api/auth/youtube/status')
    connected.value = status.connected
  }
  catch {
    connected.value = false
  }
}

async function loadPlaylists() {
  if (! connected.value) {
    return
  }
  loading.value = true
  try {
    const data = await get<{ items?: { id: string, snippet?: { title?: string, thumbnails?: { medium?: { url?: string } } }, contentDetails?: { itemCount?: number } }[] }>('/api/youtube/playlists')
    youtubePlaylists.value = (data.items ?? []).map(item => ({
      id: item.id,
      youtubeId: item.id,
      title: item.snippet?.title ?? 'Unknown',
      thumbnail: item.snippet?.thumbnails?.medium?.url ?? null,
      itemCount: item.contentDetails?.itemCount ?? 0,
    })).sort((left, right) => left.title.localeCompare(right.title))

    const existing = await get<{ youtubeId: string | null }[]>('/api/playlists')
    addedIds.value = new Set(existing.map(playlist => playlist.youtubeId).filter(Boolean) as string[])
  }
  catch (error) {
    console.error('Failed to load playlists:', error)
  }
  finally {
    loading.value = false
  }
}

function startAdd(playlist: YoutubePlaylist) {
  addingPlaylist.value = playlist
  configForm.value = {
    outputFolder: null,
    syncFrequency: 'daily',
    audioQuality: '0',
  }
}

async function confirmAdd() {
  if (! addingPlaylist.value) {
    return
  }
  try {
    await post('/api/playlists', {
      youtubeId: addingPlaylist.value.youtubeId,
      title: addingPlaylist.value.title,
      thumbnailUrl: addingPlaylist.value.thumbnail,
      ...configForm.value,
    })
    addedIds.value.add(addingPlaylist.value.youtubeId)
    addingPlaylist.value = null
  }
  catch (error) {
    console.error('Failed to add playlist:', error)
  }
}

onMounted(async () => {
  await checkConnection()
  await loadPlaylists()
})
</script>
