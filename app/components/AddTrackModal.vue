<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
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
        <button
          class="px-4 py-2 text-sm transition-colors"
          :class="tab === 'playlist' ? 'border-b-2 border-emerald-500 text-white' : 'text-zinc-400 hover:text-white'"
          @click="openPlaylistTab"
        >
          Choose from playlist
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

      <div v-if="tab === 'playlist'">
        <div
          v-if="ytNotConnected"
          class="rounded-lg border border-zinc-700 p-4 text-sm text-zinc-300"
        >
          <p class="mb-2">
            YouTube is not connected.
          </p>
          <NuxtLink
            to="/settings"
            class="inline-block rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
            @click="$emit('close')"
          >
            Connect YouTube
          </NuxtLink>
        </div>

        <div v-else-if="! selectedPlaylist">
          <p
            v-if="loadingPlaylists && ! playlists.length"
            class="text-sm text-zinc-400"
          >
            Loading playlists...
          </p>
          <div
            v-else
            class="max-h-80 space-y-2 overflow-y-auto"
          >
            <button
              v-for="playlist in playlists"
              :key="playlist.id"
              class="flex w-full items-center gap-3 rounded-lg border border-zinc-800 p-2 text-left transition-colors hover:bg-zinc-800"
              @click="selectPlaylist(playlist)"
            >
              <div class="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-zinc-800">
                <img
                  v-if="playlist.thumbnail"
                  :src="playlist.thumbnail"
                  :alt="playlist.title"
                  class="h-12 w-16 rounded object-cover"
                >
                <i
                  v-else
                  class="pi pi-heart text-pink-400"
                />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm">
                  {{ playlist.title }}
                </p>
                <p
                  v-if="playlist.itemCount !== null"
                  class="truncate text-xs text-zinc-400"
                >
                  {{ playlist.itemCount }} {{ playlist.itemCount === 1 ? 'item' : 'items' }}
                </p>
              </div>
              <i class="pi pi-chevron-right shrink-0 text-zinc-500" />
            </button>
            <div
              v-if="playlistsNextPageToken"
              ref="playlistsSentinel"
              class="py-2 text-center text-xs text-zinc-500"
            >
              {{ loadingPlaylists ? 'Loading...' : '' }}
            </div>
          </div>
        </div>

        <div v-else>
          <div class="mb-3 flex items-center gap-2">
            <button
              class="rounded-lg border border-zinc-700 px-2 py-1 text-xs transition-colors hover:bg-zinc-800"
              @click="backToPlaylists"
            >
              <i class="pi pi-arrow-left" /> Back
            </button>
            <p class="min-w-0 truncate text-sm font-medium">
              {{ selectedPlaylist.title }}
            </p>
          </div>
          <input
            v-model="playlistSearchQuery"
            type="text"
            placeholder="Filter loaded tracks..."
            class="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
          <p
            v-if="loadingPlaylistTracks && ! playlistTracks.length"
            class="text-sm text-zinc-400"
          >
            Loading tracks...
          </p>
          <div
            v-else
            class="max-h-80 space-y-2 overflow-y-auto"
          >
            <div
              v-for="track in filteredPlaylistTracks"
              :key="track.videoId"
              class="flex items-center gap-3 rounded-lg border border-zinc-800 p-2"
            >
              <img
                v-if="track.thumbnail"
                :src="track.thumbnail"
                :alt="track.title"
                class="h-12 w-16 rounded object-cover"
              >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm">
                  {{ track.title }}
                </p>
                <p class="truncate text-xs text-zinc-400">
                  {{ track.channel }}
                </p>
              </div>
              <button
                class="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs transition-colors hover:bg-zinc-800 disabled:opacity-50"
                :disabled="addedIds.has(track.videoId) || adding"
                @click="addByVideoId(track.videoId)"
              >
                {{ addedIds.has(track.videoId) ? 'Added' : 'Add' }}
              </button>
            </div>
            <div
              v-if="playlistTracksNextPageToken"
              ref="playlistTracksSentinel"
              class="py-2 text-center text-xs text-zinc-500"
            >
              {{ loadingPlaylistTracks ? 'Loading...' : '' }}
            </div>
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
  folderId: string
}>()

const emit = defineEmits<{
  close: []
  added: []
}>()

const { get, post } = useApi()

const tab = ref<'url' | 'search' | 'playlist'>('url')
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

const LIKES_ID = '__likes__'

interface PlaylistEntry {
  id: string
  title: string
  thumbnail: string | null
  itemCount: number | null
}

interface PlaylistTrack {
  videoId: string
  title: string
  channel: string
  thumbnail: string | null
}

interface YoutubeThumbnail {
  url?: string
}

interface YoutubeThumbnails {
  medium?: YoutubeThumbnail
  default?: YoutubeThumbnail
}

interface YoutubePlaylistsResponse {
  items?: {
    id?: string
    snippet?: {
      title?: string
      thumbnails?: YoutubeThumbnails
    }
    contentDetails?: { itemCount?: number }
  }[]
  nextPageToken?: string
}

interface YoutubePlaylistItemsResponse {
  items?: {
    snippet?: {
      title?: string
      videoOwnerChannelTitle?: string
      channelTitle?: string
      thumbnails?: YoutubeThumbnails
      resourceId?: { videoId?: string }
    }
  }[]
  nextPageToken?: string
}

interface YoutubeVideosResponse {
  items?: {
    id?: string
    snippet?: {
      title?: string
      channelTitle?: string
      thumbnails?: YoutubeThumbnails
    }
  }[]
  nextPageToken?: string
}

const playlists = ref<PlaylistEntry[]>([])
const playlistsNextPageToken = ref<string | null>(null)
const loadingPlaylists = ref(false)
const ytNotConnected = ref(false)
const playlistsLoaded = ref(false)

const selectedPlaylist = ref<PlaylistEntry | null>(null)
const playlistTracks = ref<PlaylistTrack[]>([])
const playlistTracksNextPageToken = ref<string | null>(null)
const loadingPlaylistTracks = ref(false)

const playlistsSentinel = ref<HTMLElement | null>(null)
const playlistTracksSentinel = ref<HTMLElement | null>(null)
const playlistSearchQuery = ref('')

const filteredPlaylistTracks = computed(() => {
  const query = playlistSearchQuery.value.trim().toLowerCase()
  if (! query) {
    return playlistTracks.value
  }
  return playlistTracks.value.filter(track =>
    track.title.toLowerCase().includes(query) || track.channel.toLowerCase().includes(query),
  )
})

function pickThumbnail(thumbnails: YoutubeThumbnails | undefined): string | null {
  return thumbnails?.medium?.url ?? thumbnails?.default?.url ?? null
}

function handleYoutubeError(error: unknown): boolean {
  const status = (error as { statusCode?: number, status?: number })?.statusCode
    ?? (error as { status?: number })?.status
  if (status === 401) {
    ytNotConnected.value = true
    errorMessage.value = ''
    return true
  }
  errorMessage.value = error instanceof Error ? error.message : 'Request failed'
  return false
}

async function openPlaylistTab() {
  tab.value = 'playlist'
  errorMessage.value = ''
  if (! playlistsLoaded.value && ! ytNotConnected.value) {
    await loadPlaylists()
  }
}

async function loadPlaylists(pageToken?: string) {
  loadingPlaylists.value = true
  try {
    const data = await get<YoutubePlaylistsResponse>(
      `/api/youtube/playlists${pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ''}`,
    )
    const mapped: PlaylistEntry[] = (data.items ?? [])
      .filter(item => !! item.id)
      .map(item => ({
        id: item.id ?? '',
        title: item.snippet?.title ?? 'Untitled',
        thumbnail: pickThumbnail(item.snippet?.thumbnails),
        itemCount: item.contentDetails?.itemCount ?? null,
      }))
    if (! pageToken) {
      playlists.value = [
        { id: LIKES_ID, title: 'Likes', thumbnail: null, itemCount: null },
        ...mapped,
      ]
    }
    else {
      playlists.value = [...playlists.value, ...mapped]
    }
    playlistsNextPageToken.value = data.nextPageToken ?? null
    playlistsLoaded.value = true
  }
  catch (error) {
    handleYoutubeError(error)
  }
  finally {
    loadingPlaylists.value = false
  }
}

async function selectPlaylist(playlist: PlaylistEntry) {
  selectedPlaylist.value = playlist
  playlistTracks.value = []
  playlistTracksNextPageToken.value = null
  errorMessage.value = ''
  await loadPlaylistTracks()
}

function backToPlaylists() {
  selectedPlaylist.value = null
  playlistTracks.value = []
  playlistTracksNextPageToken.value = null
  playlistSearchQuery.value = ''
}

async function loadPlaylistTracks(pageToken?: string) {
  if (! selectedPlaylist.value) {
    return
  }
  loadingPlaylistTracks.value = true
  try {
    const query = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ''
    let mapped: PlaylistTrack[]
    let nextPageToken: string | null
    if (selectedPlaylist.value.id === LIKES_ID) {
      const data = await get<YoutubeVideosResponse>(`/api/youtube/likes${query}`)
      mapped = (data.items ?? [])
        .filter(item => !! item.id)
        .map(item => ({
          videoId: item.id ?? '',
          title: item.snippet?.title ?? 'Untitled',
          channel: item.snippet?.channelTitle ?? '',
          thumbnail: pickThumbnail(item.snippet?.thumbnails),
        }))
      nextPageToken = data.nextPageToken ?? null
    }
    else {
      const data = await get<YoutubePlaylistItemsResponse>(
        `/api/youtube/playlists/${encodeURIComponent(selectedPlaylist.value.id)}/items${query}`,
      )
      mapped = (data.items ?? [])
        .filter(item => !! item.snippet?.resourceId?.videoId)
        .map(item => ({
          videoId: item.snippet?.resourceId?.videoId ?? '',
          title: item.snippet?.title ?? 'Untitled',
          channel: item.snippet?.videoOwnerChannelTitle ?? item.snippet?.channelTitle ?? '',
          thumbnail: pickThumbnail(item.snippet?.thumbnails),
        }))
      nextPageToken = data.nextPageToken ?? null
    }
    playlistTracks.value = pageToken ? [...playlistTracks.value, ...mapped] : mapped
    playlistTracksNextPageToken.value = nextPageToken
  }
  catch (error) {
    handleYoutubeError(error)
  }
  finally {
    loadingPlaylistTracks.value = false
  }
}

function useInfiniteScroll(
  sentinelRef: Ref<HTMLElement | null>,
  hasMore: Ref<string | null>,
  loading: Ref<boolean>,
  load: (token: string) => Promise<void>,
) {
  watch(sentinelRef, (element, _previous, onCleanup) => {
    if (! element) {
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMore.value && ! loading.value) {
        load(hasMore.value)
      }
    }, { root: element.parentElement, threshold: 0 })
    observer.observe(element)
    onCleanup(() => observer.disconnect())
  })
}

useInfiniteScroll(playlistsSentinel, playlistsNextPageToken, loadingPlaylists, loadPlaylists)
useInfiniteScroll(playlistTracksSentinel, playlistTracksNextPageToken, loadingPlaylistTracks, loadPlaylistTracks)

async function addByUrl() {
  const url = urlInput.value.trim()
  if (! url) {
    return
  }
  adding.value = true
  errorMessage.value = ''
  try {
    await post(`/api/folders/${props.folderId}/tracks`, { url })
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
    await post(`/api/folders/${props.folderId}/tracks`, { youtubeId: videoId })
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
