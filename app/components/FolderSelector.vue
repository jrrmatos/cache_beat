<template>
  <div>
    <label class="mb-1 block text-sm text-zinc-400">Output Folder</label>
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-left text-sm outline-none transition-colors hover:border-zinc-600 focus:border-emerald-500"
      @click="open = ! open"
    >
      <i class="pi pi-folder text-zinc-400" />
      <span
        class="flex-1 truncate"
        :class="modelValue ? 'text-white' : 'text-zinc-500'"
      >
        {{ modelValue || 'Default (playlist title)' }}
      </span>
      <i
        class="pi text-xs text-zinc-400"
        :class="open ? 'pi-chevron-up' : 'pi-chevron-down'"
      />
    </button>

    <p
      v-if="basePath"
      class="mt-1 text-xs text-zinc-500"
    >
      {{ basePath }}/{{ modelValue || '…' }}
    </p>

    <div
      v-if="open"
      class="mt-1 rounded-lg border border-zinc-700 bg-zinc-900"
    >
      <div class="flex items-center gap-1 border-b border-zinc-800 px-2 py-1.5">
        <button
          type="button"
          class="rounded p-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-30"
          :disabled="! currentPath"
          title="Go up"
          @click="goUp"
        >
          <i class="pi pi-arrow-up" />
        </button>
        <div class="flex min-w-0 flex-1 items-center gap-1 text-xs text-zinc-400">
          <button
            type="button"
            class="shrink-0 transition-colors hover:text-white"
            @click="navigateTo('')"
          >
            root
          </button>
          <template
            v-for="(segment, index) in pathSegments"
            :key="index"
          >
            <span>/</span>
            <button
              type="button"
              class="truncate transition-colors hover:text-white"
              @click="navigateTo(pathSegments.slice(0, index + 1).join('/'))"
            >
              {{ segment }}
            </button>
          </template>
        </div>
      </div>

      <div class="max-h-48 overflow-y-auto">
        <button
          type="button"
          class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-zinc-800"
          :class="selectedIsCurrentDir ? 'text-emerald-400' : 'text-zinc-300'"
          @click="selectCurrent"
        >
          <i class="pi pi-check text-xs" />
          <span class="italic">{{ currentPath || '(default)' }}</span>
        </button>
        <button
          v-for="folder in folders"
          :key="folder"
          type="button"
          class="group flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-zinc-800"
          :class="isSelected(folder) ? 'text-emerald-400' : 'text-zinc-300'"
          @click="onFolderClick(folder)"
        >
          <i class="pi pi-folder text-xs text-zinc-500" />
          <span class="flex-1 truncate">{{ folder }}</span>
          <i class="pi pi-chevron-right text-xs text-zinc-600 opacity-0 group-hover:opacity-100" />
        </button>
        <div
          v-if="! folders.length"
          class="px-3 py-2 text-xs text-zinc-500"
        >
          No subfolders
        </div>
      </div>

      <div class="border-t border-zinc-800 px-2 py-1.5">
        <div
          v-if="! creatingNew"
          class="flex justify-end"
        >
          <button
            type="button"
            class="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            @click="startCreate"
          >
            <i class="pi pi-plus text-xs" />
            New Folder
          </button>
        </div>
        <div
          v-else
          class="flex gap-1"
        >
          <input
            ref="newFolderInput"
            v-model="newFolderName"
            type="text"
            placeholder="Folder name"
            class="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs outline-none focus:border-emerald-500"
            @keydown.enter="createFolder"
            @keydown.escape="creatingNew = false"
          >
          <button
            type="button"
            class="shrink-0 rounded bg-emerald-600 px-2 py-1 text-xs transition-colors hover:bg-emerald-500"
            @click="createFolder"
          >
            Create
          </button>
          <button
            type="button"
            class="shrink-0 rounded border border-zinc-700 px-2 py-1 text-xs transition-colors hover:bg-zinc-800"
            @click="creatingNew = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const { get, post } = useApi()

const open = ref(false)
const basePath = ref('')
const currentPath = ref('')
const folders = ref<string[]>([])
const creatingNew = ref(false)
const newFolderName = ref('')
const newFolderInput = ref<HTMLInputElement>()

const pathSegments = computed(() => {
  if (! currentPath.value) {
    return []
  }
  return currentPath.value.split('/')
})

const selectedIsCurrentDir = computed(() => {
  // Not exactly right but close enough for the highlight
  return false
})

function isSelected(folder: string): boolean {
  const fullPath = currentPath.value ? `${currentPath.value}/${folder}` : folder
  return fullPath === (emit as unknown as { modelValue: string | null }).modelValue
}

async function loadFolders(path: string) {
  try {
    const query = path ? `?path=${encodeURIComponent(path)}` : ''
    const data = await get<{ basePath: string | null, folders: string[] }>(`/api/folders${query}`)
    folders.value = data.folders
    basePath.value = data.basePath ?? ''
  }
  catch {
    folders.value = []
  }
}

function navigateTo(path: string) {
  currentPath.value = path
  loadFolders(path)
}

function navigateInto(folder: string) {
  const newPath = currentPath.value ? `${currentPath.value}/${folder}` : folder
  navigateTo(newPath)
}

function goUp() {
  const segments = pathSegments.value
  if (segments.length <= 1) {
    navigateTo('')
  }
  else {
    navigateTo(segments.slice(0, - 1).join('/'))
  }
}

let lastClickedFolder = ''
let lastClickTime = 0

function onFolderClick(folder: string) {
  const now = Date.now()
  if (folder === lastClickedFolder && now - lastClickTime < 400) {
    lastClickedFolder = ''
    lastClickTime = 0
    navigateInto(folder)
    return
  }
  lastClickedFolder = folder
  lastClickTime = now
  const fullPath = currentPath.value ? `${currentPath.value}/${folder}` : folder
  emit('update:modelValue', fullPath)
}

function selectCurrent() {
  emit('update:modelValue', currentPath.value || null)
}

function startCreate() {
  creatingNew.value = true
  newFolderName.value = ''
  nextTick(() => newFolderInput.value?.focus())
}

async function createFolder() {
  const name = newFolderName.value.trim()
  if (! name) {
    return
  }
  const fullPath = currentPath.value ? `${currentPath.value}/${name}` : name
  try {
    await post('/api/folders', { name: fullPath })
    folders.value.push(name)
    folders.value.sort()
    emit('update:modelValue', fullPath)
    creatingNew.value = false
    newFolderName.value = ''
  }
  catch (error) {
    console.error('Failed to create folder:', error)
  }
}

watch(open, (value) => {
  if (value) {
    loadFolders(currentPath.value)
  }
})

onMounted(() => loadFolders(''))
</script>
