<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6">
      <h3 class="mb-4 text-lg font-semibold">
        Add Track
      </h3>

      <div class="mb-4 flex gap-2 border-b border-zinc-800">
        <button
          class="px-4 py-2 text-sm transition-colors"
          :class="tab === 'url' ? 'border-b-2 border-emerald-500 text-white' : 'text-zinc-400 hover:text-white'"
          @click="tab = 'url'"
        >
          Paste URL
        </button>
        <button
          class="px-4 py-2 text-sm transition-colors"
          :class="tab === 'search' ? 'border-b-2 border-emerald-500 text-white' : 'text-zinc-400 hover:text-white'"
          @click="tab = 'search'"
        >
          Search YouTube
        </button>
      </div>

      <div v-if="tab === 'url'">
        <input
          v-model="urlInput"
          type="url"
          placeholder="https://youtube.com/watch?v=... or https://music.youtube.com/watch?v=..."
          class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          @keydown.enter="addByUrl"
        >
        <p class="mt-1 text-xs text-zinc-500">
          YouTube, YouTube Music, or any yt-dlp compatible URL
        </p>
        <button
          class="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500 disabled:opacity-50"
          :disabled="! urlInput.trim() || adding"
          @click="addByUrl"
        >
          {{ adding ? 'Adding...' : 'Add Track' }}
        </button>
      </div>

      <div v-if="tab === 'search'">
        <div class="flex gap-2">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search YouTube..."
            class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            @keydown.enter="search"
          >
          <button
            class="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500 disabled:opacity-50"
            :disabled="! searchQuery.trim() || searching"
            @click="search"
          >
            {{ searching ? 'Searching...' : 'Search' }}
          </button>
        </div>
        <div
          v-if="searchResults.length"
          class="mt-3 max-h-64 space-y-2 overflow-y-auto"
        >
          <div
            v-for="result in searchResults"
            :key="result.videoId"
            class="flex items-center gap-3 rounded-lg border border-zinc-800 p-2"
          >
            <img
              v-if="result.thumbnail"
              :src="result.thumbnail"
              :alt="result.title"
              class="h-12 w-16 rounded object-cover"
            >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm">
                {{ result.title }}
              </p>
              <p class="truncate text-xs text-zinc-400">
                {{ result.channel }}
              </p>
            </div>
            <button
              class="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs transition-colors hover:bg-zinc-800 disabled:opacity-50"
              :disabled="addedIds.has(result.videoId) || adding"
              @click="addByVideoId(result.videoId)"
            >
              {{ addedIds.has(result.videoId) ? 'Added' : 'Add' }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="errorMessage"
        class="mt-3 rounded-lg bg-red-900/30 p-2 text-sm text-red-300"
      >
        {{ errorMessage }}
      </div>

      <div class="mt-4 flex justify-end">
        <button
          class="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition-colors hover:bg-zinc-800"
          @click="$emit('close')"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  playlistId: string
}>()

const emit = defineEmits<{
  close: []
  added: []
}>()

const { get, post } = useApi()

const tab = ref<'url' | 'search'>('url')
const urlInput = ref('')
const searchQuery = ref('')
const searching = ref(false)
const adding = ref(false)
const errorMessage = ref('')
const addedIds = ref(new Set<string>())

interface SearchResult {
  videoId: string
  title: string
  channel: string
  thumbnail: string | null
}

const searchResults = ref<SearchResult[]>([])

async function addByUrl() {
  const url = urlInput.value.trim()
  if (! url) {
    return
  }
  adding.value = true
  errorMessage.value = ''
  try {
    await post(`/api/playlists/${props.playlistId}/tracks`, { url })
    urlInput.value = ''
    emit('added')
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to add track'
  }
  finally {
    adding.value = false
  }
}

async function addByVideoId(videoId: string) {
  adding.value = true
  errorMessage.value = ''
  try {
    await post(`/api/playlists/${props.playlistId}/tracks`, { youtubeId: videoId })
    addedIds.value.add(videoId)
    emit('added')
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to add track'
  }
  finally {
    adding.value = false
  }
}

async function search() {
  if (! searchQuery.value.trim()) {
    return
  }
  searching.value = true
  errorMessage.value = ''
  try {
    const data = await get<{ items?: { id?: { videoId?: string }, snippet?: { title?: string, channelTitle?: string, thumbnails?: { medium?: { url?: string } } } }[] }>(`/api/youtube/search?q=${encodeURIComponent(searchQuery.value)}`)
    searchResults.value = (data.items ?? [])
      .filter(item => !! item.id?.videoId)
      .map(item => ({
        videoId: item.id?.videoId ?? '',
        title: item.snippet?.title ?? 'Unknown',
        channel: item.snippet?.channelTitle ?? '',
        thumbnail: item.snippet?.thumbnails?.medium?.url ?? null,
      }))
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Search failed'
  }
  finally {
    searching.value = false
  }
}
</script>
