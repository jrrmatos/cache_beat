<template>
  <div
    v-if="folder"
    class="space-y-6"
  >
    <div class="space-y-3">
      <div class="flex items-center gap-4">
        <button
          class="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          @click="$router.back()"
        >
          <i class="pi pi-arrow-left" />
        </button>
        <div class="min-w-0 flex-1">
          <div
            v-if="! renaming"
            class="flex items-center gap-2"
          >
            <h1 class="truncate text-xl font-bold sm:text-2xl">
              {{ folder.name }}
            </h1>
            <button
              class="shrink-0 rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              title="Rename folder"
              @click="startRename"
            >
              <i class="pi pi-pencil text-xs" />
            </button>
            <span
              v-if="folder.playlist"
              class="shrink-0 rounded px-2 py-0.5 text-xs"
              :class="folder.playlist.isCustom ? 'bg-violet-900/50 text-violet-300' : 'bg-blue-900/50 text-blue-300'"
            >
              {{ folder.playlist.isCustom ? 'Custom' : 'YouTube' }}
            </span>
          </div>
          <div
            v-else
            class="flex items-center gap-2"
          >
            <input
              ref="renameInput"
              v-model="renameValue"
              type="text"
              class="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xl font-bold focus:border-emerald-500 focus:outline-none sm:text-2xl"
              :disabled="renameSaving"
              @keydown.enter="submitRename"
              @keydown.escape="cancelRename"
            >
            <button
              class="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-emerald-500 disabled:opacity-50"
              :disabled="renameSaving"
              @click="submitRename"
            >
              Save
            </button>
            <button
              class="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-800 disabled:opacity-50"
              :disabled="renameSaving"
              @click="cancelRename"
            >
              Cancel
            </button>
          </div>
          <p
            v-if="renameError"
            class="mt-1 text-sm text-red-400"
          >
            {{ renameError }}
          </p>
          <p
            v-else
            class="text-sm text-zinc-400"
          >
            {{ folder.tracks.length }} tracks
          </p>
        </div>
      </div>

      <button
        class="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm transition-colors hover:bg-zinc-800 sm:hidden"
        @click="showMobileActions = ! showMobileActions"
      >
        <i class="pi pi-bars" />
        <span>Actions</span>
        <i :class="['pi', showMobileActions ? 'pi-chevron-up' : 'pi-chevron-down']" />
      </button>

      <div
        class="gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
        :class="showMobileActions ? 'mt-2 flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-3' : 'hidden'"
        @click="showMobileActions = false"
      >
        <button
          class="flex items-center gap-2 rounded-lg border border-red-900 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-900/30"
          @click="confirmDelete"
        >
          <i class="pi pi-trash" />
          <span>Delete</span>
        </button>

        <button
          class="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-800"
          @click="showNewSubfolder = ! showNewSubfolder"
        >
          <i class="pi pi-folder-plus" />
          <span>New Subfolder</span>
        </button>

        <button
          class="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-800"
          @click="openMove"
        >
          <i class="pi pi-arrows-alt" />
          <span>Move</span>
        </button>

        <button
          class="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-800 disabled:opacity-50"
          :disabled="scanning"
          @click="scanFiles"
        >
          <i
            class="pi pi-search"
            :class="{ 'animate-spin': scanning }"
          />
          <span>Scan Files</span>
        </button>

        <button
          class="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-800"
          @click="showAddTrack = true"
        >
          <i class="pi pi-plus" />
          <span>Add Track</span>
        </button>

        <template v-if="folder.playlist">
          <button
            v-if="! folder.playlist.isCustom"
            class="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-800 disabled:opacity-50"
            :disabled="syncingMetadata"
            @click="syncMetadata"
          >
            <i
              class="pi pi-sync"
              :class="{ 'animate-spin': syncingMetadata }"
            />
            <span>Sync Metadata</span>
          </button>

          <button
            v-if="! folder.playlist.isCustom"
            class="flex items-center gap-2 rounded-lg border border-amber-800 px-3 py-1.5 text-sm text-amber-300 transition-colors hover:bg-amber-900/30"
            @click="convertToCustom"
          >
            <i class="pi pi-arrow-right-arrow-left" />
            <span>Convert to Custom</span>
          </button>

          <button
            class="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-800"
            @click="showConfig = ! showConfig"
          >
            <i class="pi pi-cog" />
            <span>Config</span>
          </button>

          <button
            class="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-orange-400 transition-colors hover:bg-zinc-800"
            @click="detachPlaylist"
          >
            <i class="pi pi-link" />
            <span>Detach Playlist</span>
          </button>
        </template>
        <template v-else>
          <button
            class="flex items-center gap-2 rounded-lg border border-violet-800 px-3 py-1.5 text-sm text-violet-300 transition-colors hover:bg-violet-900/30"
            @click="showAttachPlaylist = true"
          >
            <i class="pi pi-link" />
            <span>Attach Playlist</span>
          </button>
        </template>

        <button
          class="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-800 disabled:opacity-50"
          :disabled="renumbering"
          @click="renumberFiles"
        >
          <i class="pi pi-sort-numeric-up" />
          <span>Renumber Files</span>
        </button>

        <button
          class="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-emerald-500 disabled:opacity-50"
          :disabled="syncingFiles"
          @click="syncFiles"
        >
          <i
            class="pi pi-download"
            :class="{ 'animate-pulse': syncingFiles }"
          />
          {{ syncingFiles ? 'Downloading...' : 'Download' }}
        </button>
      </div>
    </div>

    <DownloadProgress />

    <!-- New Subfolder -->
    <div
      v-if="showNewSubfolder"
      class="flex gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
    >
      <input
        v-model="newSubfolderName"
        type="text"
        placeholder="Subfolder name"
        class="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        @keydown.enter="createSubfolder"
      >
      <button
        class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500"
        @click="createSubfolder"
      >
        Create
      </button>
      <button
        class="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition-colors hover:bg-zinc-800"
        @click="showNewSubfolder = false"
      >
        Cancel
      </button>
    </div>

    <!-- Move Folder -->
    <div
      v-if="showMove"
      class="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
    >
      <h2 class="text-sm font-medium text-zinc-300">
        Move to
      </h2>
      <select
        v-model="moveTargetParentId"
        class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        :disabled="moveSaving"
      >
        <option :value="null">
          (Root)
        </option>
        <option
          v-for="option in moveOptions"
          :key="option.id"
          :value="option.id"
        >
          {{ '\u00A0\u00A0'.repeat(option.depth) + option.name }}
        </option>
      </select>
      <p
        v-if="moveError"
        class="text-sm text-red-400"
      >
        {{ moveError }}
      </p>
      <div class="flex gap-2">
        <button
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500 disabled:opacity-50"
          :disabled="moveSaving"
          @click="submitMove"
        >
          {{ moveSaving ? 'Moving...' : 'Move' }}
        </button>
        <button
          class="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition-colors hover:bg-zinc-800 disabled:opacity-50"
          :disabled="moveSaving"
          @click="showMove = false"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Config Panel -->
    <div
      v-if="showConfig && folder.playlist"
      class="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
    >
      <h2 class="mb-4 font-semibold">
        Playlist Configuration
      </h2>
      <PlaylistConfigForm
        v-model="configForm"
        :hide-sync="folder.playlist.isCustom"
      />
      <div class="mt-4 flex items-center gap-3">
        <button
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500"
          @click="saveConfig"
        >
          Save
        </button>
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="isActive"
            type="checkbox"
            class="rounded"
          >
          Active
        </label>
      </div>
    </div>

    <!-- Child Folders -->
    <div
      v-if="folder.children.length"
      class="space-y-1"
    >
      <h2 class="text-sm font-medium text-zinc-400">
        Subfolders
      </h2>
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="child in folder.children"
          :key="child.id"
          :to="`/folders/${child.id}`"
          class="flex items-center gap-3 rounded-lg border border-zinc-800 px-4 py-3 transition-colors hover:bg-zinc-800"
        >
          <i class="pi pi-folder text-zinc-500" />
          <span class="truncate text-sm">{{ child.name }}</span>
          <i
            v-if="child.playlistId"
            class="pi pi-list text-xs text-violet-400"
          />
        </NuxtLink>
      </div>
    </div>

    <!-- Tracks -->
    <div class="rounded-xl border border-zinc-800">
      <draggable
        v-model="folder.tracks"
        item-key="id"
        handle=".drag-handle"
        :animation="200"
        @end="onDragEnd"
      >
        <template #item="{ element: track }">
          <TrackRow
            :track="track"
            :deletable="true"
            :draggable="true"
            @retry="retryTrack"
            @download="downloadTrack"
            @edit="openEditTrack"
            @delete="deleteTrack"
          />
        </template>
      </draggable>
      <div
        v-if="! folder.tracks.length"
        class="p-8 text-center text-zinc-500"
      >
        No tracks yet. Add tracks or scan files to get started.
      </div>
    </div>

    <!-- Edit Track Override Modal -->
    <div
      v-if="editingTrack"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="cancelEdit"
    >
      <div class="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6">
        <h3 class="mb-1 font-semibold">
          Override Track URL
        </h3>
        <p class="mb-4 truncate text-sm text-zinc-400">
          {{ editingTrack.title }}
        </p>

        <div class="mb-4 flex gap-2 border-b border-zinc-800">
          <button
            class="px-4 py-2 text-sm transition-colors"
            :class="overrideTab === 'url' ? 'border-b-2 border-emerald-500 text-white' : 'text-zinc-400 hover:text-white'"
            @click="overrideTab = 'url'"
          >
            Paste URL
          </button>
          <button
            class="px-4 py-2 text-sm transition-colors"
            :class="overrideTab === 'search' ? 'border-b-2 border-emerald-500 text-white' : 'text-zinc-400 hover:text-white'"
            @click="overrideTab = 'search'"
          >
            Search YouTube
          </button>
        </div>

        <div v-if="overrideTab === 'url'">
          <input
            v-model="editOverrideUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            @keydown.enter="saveOverrideUrl"
          >
          <p class="mt-1 text-xs text-zinc-500">
            Leave empty to use the original YouTube video. Accepts any yt-dlp compatible URL.
          </p>
        </div>

        <div v-if="overrideTab === 'search'">
          <div class="flex gap-2">
            <input
              v-model="overrideSearchQuery"
              type="text"
              placeholder="Search YouTube..."
              class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              @keydown.enter="searchOverride"
            >
            <button
              class="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500 disabled:opacity-50"
              :disabled="! overrideSearchQuery.trim() || overrideSearching"
              @click="searchOverride"
            >
              {{ overrideSearching ? 'Searching...' : 'Search' }}
            </button>
          </div>
          <div
            v-if="overrideSearchResults.length"
            class="mt-3 max-h-64 space-y-2 overflow-y-auto"
          >
            <div
              v-for="result in overrideSearchResults"
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
                class="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs transition-colors hover:bg-zinc-800"
                @click="selectOverrideResult(result.videoId)"
              >
                Select
              </button>
            </div>
          </div>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button
            class="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition-colors hover:bg-zinc-800"
            @click="cancelEdit"
          >
            Cancel
          </button>
          <button
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500"
            @click="saveOverrideUrl"
          >
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- Attach Playlist Modal -->
    <div
      v-if="showAttachPlaylist"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      @click.self="showAttachPlaylist = false"
    >
      <div class="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6">
        <h3 class="mb-4 text-lg font-semibold">
          Attach Playlist
        </h3>

        <div class="mb-4 flex gap-2 border-b border-zinc-800">
          <button
            class="px-4 py-2 text-sm transition-colors"
            :class="attachTab === 'custom' ? 'border-b-2 border-emerald-500 text-white' : 'text-zinc-400 hover:text-white'"
            @click="attachTab = 'custom'"
          >
            Custom Playlist
          </button>
          <button
            class="px-4 py-2 text-sm transition-colors"
            :class="attachTab === 'youtube' ? 'border-b-2 border-emerald-500 text-white' : 'text-zinc-400 hover:text-white'"
            @click="attachTab = 'youtube'"
          >
            YouTube Playlist
          </button>
        </div>

        <div v-if="attachTab === 'custom'">
          <input
            v-model="attachCustomTitle"
            type="text"
            placeholder="Playlist title"
            class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
          <button
            class="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500 disabled:opacity-50"
            :disabled="! attachCustomTitle.trim()"
            @click="attachCustomPlaylist"
          >
            Create & Attach
          </button>
        </div>

        <div v-if="attachTab === 'youtube'">
          <div
            v-if="youtubePlaylists.length"
            class="max-h-64 space-y-2 overflow-y-auto"
          >
            <div
              v-for="ytPlaylist in youtubePlaylists"
              :key="ytPlaylist.id"
              class="flex items-center gap-3 rounded-lg border border-zinc-800 p-2"
            >
              <img
                v-if="ytPlaylist.thumbnail"
                :src="ytPlaylist.thumbnail"
                :alt="ytPlaylist.title"
                class="h-10 w-14 rounded object-cover"
              >
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm">
                  {{ ytPlaylist.title }}
                </p>
                <p class="text-xs text-zinc-400">
                  {{ ytPlaylist.itemCount }} items
                </p>
              </div>
              <button
                class="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs transition-colors hover:bg-zinc-800"
                @click="attachYoutubePlaylist(ytPlaylist)"
              >
                Attach
              </button>
            </div>
          </div>
          <p
            v-else-if="! loadingYoutube"
            class="text-sm text-zinc-500"
          >
            No YouTube playlists found. Connect YouTube in Settings first.
          </p>
          <p
            v-else
            class="text-sm text-zinc-500"
          >
            Loading...
          </p>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            class="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition-colors hover:bg-zinc-800"
            @click="showAttachPlaylist = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <AddTrackModal
      v-if="showAddTrack"
      :folder-id="folder.id"
      @close="showAddTrack = false"
      @added="loadFolder"
    />
  </div>

  <div
    v-else
    class="flex items-center justify-center py-16"
  >
    <i class="pi pi-spin pi-spinner text-2xl text-zinc-400" />
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'

const route = useRoute()
const router = useRouter()
const { get, post, put, patch, del } = useApi()

interface Track {
  id: string
  position: number
  title: string
  artist: string | null
  thumbnailUrl: string | null
  status: string
  errorMessage: string | null
  overrideUrl: string | null
  removedFromSource: number
}

interface Playlist {
  id: string
  title: string
  youtubeId: string | null
  syncFrequency: string
  audioQuality: string
  isActive: number
  isCustom: number
}

interface ChildFolder {
  id: string
  name: string
  playlistId: string | null
}

interface FolderDetail {
  id: string
  name: string
  parentId: string | null
  playlistId: string | null
  playlist: Playlist | null
  children: ChildFolder[]
  tracks: Track[]
}

const folder = ref<FolderDetail | null>(null)
const syncingMetadata = ref(false)
const syncingFiles = ref(false)
const scanning = ref(false)
const renumbering = ref(false)
const showConfig = ref(false)
const showAddTrack = ref(false)
const showNewSubfolder = ref(false)
const showAttachPlaylist = ref(false)
const newSubfolderName = ref('')
const renaming = ref(false)
const renameValue = ref('')
const renameError = ref('')
const renameSaving = ref(false)
const renameInput = ref<HTMLInputElement | null>(null)
const showMove = ref(false)
const moveTargetParentId = ref<string | null>(null)
const moveError = ref('')
const moveSaving = ref(false)
const showMobileActions = ref(false)
const { tree: folderTree, load: reloadFolderTree } = useFolderTree()

interface MoveOption {
  id: string
  name: string
  depth: number
}

function flattenTreeExcluding(nodes: FolderTreeNode[], excludeId: string, depth = 0): MoveOption[] {
  const result: MoveOption[] = []
  for (const node of nodes) {
    if (node.id === excludeId) {
      continue
    }
    result.push({ id: node.id, name: node.name, depth })
    result.push(...flattenTreeExcluding(node.children, excludeId, depth + 1))
  }
  return result
}

const moveOptions = computed<MoveOption[]>(() => {
  if (! folder.value) {
    return []
  }
  return flattenTreeExcluding(folderTree.value, folder.value.id)
})
const configForm = ref({
  syncFrequency: 'daily',
  audioQuality: '0',
})
const isActive = ref(true)
let pollInterval: ReturnType<typeof setInterval> | null = null

// Attach playlist state
const attachTab = ref<'custom' | 'youtube'>('custom')
const attachCustomTitle = ref('')

interface YouTubePlaylistItem {
  id: string
  title: string
  thumbnail: string | null
  itemCount: number
}
const youtubePlaylists = ref<YouTubePlaylistItem[]>([])
const loadingYoutube = ref(false)

async function onDragEnd() {
  if (! folder.value) {
    return
  }
  folder.value.tracks = folder.value.tracks.map((track, index) => ({ ...track, position: index }))
  await post(`/api/folders/${route.params.id}/tracks/reorder`, {
    trackIds: folder.value.tracks.map(track => track.id),
  })
  await loadFolder()
}

function hasActiveDownloads(): boolean {
  if (! folder.value) {
    return false
  }
  return folder.value.tracks.some(track =>
    track.status === 'downloading' || (track.status === 'pending' && syncingFiles.value),
  )
}

function startPolling() {
  if (pollInterval) {
    return
  }
  pollInterval = setInterval(async () => {
    await loadFolder()
    if (! hasActiveDownloads()) {
      stopPolling()
    }
  }, 2000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

async function loadFolder() {
  const data = await get<FolderDetail>(`/api/folders/${route.params.id}`)
  folder.value = data
  if (data.playlist) {
    configForm.value = {
      syncFrequency: data.playlist.syncFrequency,
      audioQuality: data.playlist.audioQuality,
    }
    isActive.value = !! data.playlist.isActive
  }
  if (data.tracks.some(track => track.status === 'downloading')) {
    startPolling()
  }
}

async function syncMetadata() {
  syncingMetadata.value = true
  try {
    await post(`/api/folders/${route.params.id}/sync?type=metadata`)
    await loadFolder()
  }
  catch (error) {
    console.error('Metadata sync failed:', error)
  }
  finally {
    syncingMetadata.value = false
  }
}

async function syncFiles() {
  syncingFiles.value = true
  try {
    await post(`/api/folders/${route.params.id}/sync?type=files`)
    await loadFolder()
    startPolling()
  }
  catch (error) {
    console.error('File sync failed:', error)
  }
  finally {
    syncingFiles.value = false
  }
}

async function scanFiles() {
  scanning.value = true
  try {
    await post(`/api/folders/${route.params.id}/scan`)
    await loadFolder()
  }
  catch (error) {
    console.error('Scan failed:', error)
  }
  finally {
    scanning.value = false
  }
}

async function renumberFiles() {
  renumbering.value = true
  try {
    await post(`/api/folders/${route.params.id}/renumber`)
    await loadFolder()
  }
  catch (error) {
    console.error('Renumber failed:', error)
  }
  finally {
    renumbering.value = false
  }
}

async function saveConfig() {
  if (! folder.value?.playlist) {
    return
  }
  await put(`/api/playlists/${folder.value.playlist.id}`, {
    ...configForm.value,
    isActive: isActive.value ? 1 : 0,
  })
  await loadFolder()
  showConfig.value = false
}

async function confirmDelete() {
  const hasPlaylist = folder.value?.playlist
  let deletePlaylist = false

  if (hasPlaylist) {
    const choice = confirm('Delete this folder and its linked playlist? Click Cancel to keep the playlist.')
    if (! choice) {
      if (! confirm('Delete folder only? The playlist will be removed from the folder.')) {
        return
      }
    }
    else {
      deletePlaylist = true
    }
  }
  else {
    if (! confirm('Delete this folder? Downloaded files will be kept.')) {
      return
    }
  }

  await del(`/api/folders/${route.params.id}?deletePlaylist=${deletePlaylist}`)
  router.push('/')
}

async function convertToCustom() {
  if (! folder.value?.playlist) {
    return
  }
  if (! confirm('Convert to custom playlist? This will remove the YouTube association and cannot be undone.')) {
    return
  }
  await post(`/api/playlists/${folder.value.playlist.id}/convert`)
  await loadFolder()
}

async function detachPlaylist() {
  if (! confirm('Detach the playlist from this folder? Tracks will remain in the folder.')) {
    return
  }
  await post(`/api/folders/${route.params.id}/detach-playlist`)
  await loadFolder()
}

async function createSubfolder() {
  const name = newSubfolderName.value.trim()
  if (! name) {
    return
  }
  await post('/api/folders', { name, parentId: route.params.id })
  newSubfolderName.value = ''
  showNewSubfolder.value = false
  await loadFolder()
  await reloadFolderTree()
}

function startRename() {
  if (! folder.value) {
    return
  }
  renameValue.value = folder.value.name
  renameError.value = ''
  renaming.value = true
  nextTick(() => {
    renameInput.value?.focus()
    renameInput.value?.select()
  })
}

function cancelRename() {
  renaming.value = false
  renameError.value = ''
}

async function openMove() {
  if (! folder.value) {
    return
  }
  moveTargetParentId.value = folder.value.parentId
  moveError.value = ''
  showMove.value = true
  if (! folderTree.value.length) {
    await reloadFolderTree()
  }
}

async function submitMove() {
  if (! folder.value) {
    return
  }
  if (moveTargetParentId.value === folder.value.parentId) {
    showMove.value = false
    return
  }
  moveSaving.value = true
  moveError.value = ''
  try {
    await put(`/api/folders/${route.params.id}`, { parentId: moveTargetParentId.value })
    showMove.value = false
    await loadFolder()
    await reloadFolderTree()
  }
  catch (error) {
    const message = (error as { data?: { message?: string }, statusMessage?: string }).data?.message
      ?? (error as { statusMessage?: string }).statusMessage
      ?? 'Failed to move folder'
    moveError.value = message
  }
  finally {
    moveSaving.value = false
  }
}

async function submitRename() {
  if (! folder.value) {
    return
  }
  const name = renameValue.value.trim()
  if (! name) {
    renameError.value = 'Folder name cannot be empty'
    return
  }
  if (name === folder.value.name) {
    renaming.value = false
    return
  }
  if (/[<>:"\\|?*/]/.test(name) || name.includes('..')) {
    renameError.value = 'Invalid characters in folder name'
    return
  }
  renameSaving.value = true
  renameError.value = ''
  try {
    await put(`/api/folders/${route.params.id}`, { name })
    renaming.value = false
    await loadFolder()
    await reloadFolderTree()
  }
  catch (error) {
    const message = (error as { data?: { message?: string }, statusMessage?: string }).data?.message
      ?? (error as { statusMessage?: string }).statusMessage
      ?? 'Failed to rename folder'
    renameError.value = message
  }
  finally {
    renameSaving.value = false
  }
}

async function deleteTrack(trackId: string) {
  if (! confirm('Remove this track?')) {
    return
  }
  await del(`/api/folders/${route.params.id}/tracks/${trackId}`)
  await loadFolder()
}

// Edit track override
const editingTrack = ref<Track | null>(null)
const editOverrideUrl = ref('')
const overrideTab = ref<'url' | 'search'>('url')
const overrideSearchQuery = ref('')
const overrideSearching = ref(false)
const overrideSearchResults = ref<{ videoId: string, title: string, channel: string, thumbnail: string | null }[]>([])

function openEditTrack(trackId: string) {
  const track = folder.value?.tracks.find(item => item.id === trackId)
  if (! track) {
    return
  }
  editingTrack.value = track
  editOverrideUrl.value = track.overrideUrl ?? ''
  overrideTab.value = 'url'
  overrideSearchQuery.value = ''
  overrideSearchResults.value = []
}

async function searchOverride() {
  if (! overrideSearchQuery.value.trim()) {
    return
  }
  overrideSearching.value = true
  try {
    const data = await get<{ items?: { id?: { videoId?: string }, snippet?: { title?: string, channelTitle?: string, thumbnails?: { medium?: { url?: string } } } }[] }>(`/api/youtube/search?q=${encodeURIComponent(overrideSearchQuery.value)}`)
    overrideSearchResults.value = (data.items ?? [])
      .filter(item => !! item.id?.videoId)
      .map(item => ({
        videoId: item.id?.videoId ?? '',
        title: item.snippet?.title ?? 'Unknown',
        channel: item.snippet?.channelTitle ?? '',
        thumbnail: item.snippet?.thumbnails?.medium?.url ?? null,
      }))
  }
  catch (error) {
    console.error('Override search failed:', error)
  }
  finally {
    overrideSearching.value = false
  }
}

function selectOverrideResult(videoId: string) {
  editOverrideUrl.value = `https://www.youtube.com/watch?v=${videoId}`
  overrideTab.value = 'url'
}

async function saveOverrideUrl() {
  if (! editingTrack.value) {
    return
  }
  await patch(`/api/tracks/${editingTrack.value.id}`, { overrideUrl: editOverrideUrl.value })
  editingTrack.value = null
  await loadFolder()
}

function cancelEdit() {
  editingTrack.value = null
}

async function retryTrack(trackId: string) {
  await post(`/api/tracks/${trackId}/retry`)
  await loadFolder()
  startPolling()
}

async function downloadTrack(trackId: string, force: boolean) {
  await post(`/api/tracks/${trackId}/download?force=${force}`)
  await loadFolder()
  startPolling()
}

// Attach playlist
async function attachCustomPlaylist() {
  const title = attachCustomTitle.value.trim()
  if (! title) {
    return
  }
  await post(`/api/folders/${route.params.id}/attach-playlist`, { type: 'custom', title })
  attachCustomTitle.value = ''
  showAttachPlaylist.value = false
  await loadFolder()
}

async function attachYoutubePlaylist(ytPlaylist: YouTubePlaylistItem) {
  await post(`/api/folders/${route.params.id}/attach-playlist`, {
    type: 'youtube',
    youtubeId: ytPlaylist.id,
    title: ytPlaylist.title,
    thumbnailUrl: ytPlaylist.thumbnail,
  })
  showAttachPlaylist.value = false
  await loadFolder()
}

watch(showAttachPlaylist, async (value) => {
  if (value && attachTab.value === 'youtube') {
    await loadYoutubePlaylists()
  }
})

watch(attachTab, async (value) => {
  if (value === 'youtube' && ! youtubePlaylists.value.length) {
    await loadYoutubePlaylists()
  }
})

async function loadYoutubePlaylists() {
  loadingYoutube.value = true
  try {
    const data = await get<{ items?: { id?: string, snippet?: { title?: string, thumbnails?: { medium?: { url?: string } } }, contentDetails?: { itemCount?: number } }[] }>('/api/youtube/playlists')
    youtubePlaylists.value = (data.items ?? [])
      .filter(item => !! item.id)
      .map(item => ({
        id: item.id ?? '',
        title: item.snippet?.title ?? 'Unknown',
        thumbnail: item.snippet?.thumbnails?.medium?.url ?? null,
        itemCount: item.contentDetails?.itemCount ?? 0,
      }))
      .sort((left, right) => left.title.localeCompare(right.title))
  }
  catch (error) {
    console.error('Failed to load YouTube playlists:', error)
  }
  finally {
    loadingYoutube.value = false
  }
}

onMounted(loadFolder)
onUnmounted(stopPolling)
</script>
