<template>
  <ul
    class="space-y-0.5"
    :class="depth > 0 ? 'ml-3' : ''"
  >
    <li
      v-for="folder in folders"
      :key="folder.id"
    >
      <div
        class="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-zinc-800 cursor-pointer"
        :class="activeId === folder.id ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-300'"
        @click="$emit('select', folder.id)"
      >
        <button
          v-if="folder.children.length"
          class="shrink-0 p-0.5 text-zinc-500 hover:text-zinc-300"
          @click.stop="toggle(folder.id)"
        >
          <i
            class="pi text-xs"
            :class="expanded.has(folder.id) ? 'pi-chevron-down' : 'pi-chevron-right'"
          />
        </button>
        <span
          v-else
          class="w-5"
        />
        <i class="pi pi-folder text-xs text-zinc-500" />
        <span class="truncate flex-1 text-xs">{{ folder.name }}</span>
        <i
          v-if="folder.playlistId"
          class="pi pi-list text-[10px] text-violet-400"
          title="Has playlist"
        />
        <span
          v-if="folder.trackCount"
          class="text-[10px] text-zinc-500"
        >{{ folder.trackCount }}</span>
      </div>
      <FolderTree
        v-if="folder.children.length && expanded.has(folder.id)"
        :folders="folder.children"
        :depth="depth + 1"
        :active-id="activeId"
        :expanded="expanded"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
interface FolderNode {
  id: string
  name: string
  playlistId: string | null
  trackCount: number
  children: FolderNode[]
}

defineProps<{
  folders: FolderNode[]
  depth: number
  activeId: string | null
  expanded: Set<string>
}>()

const emit = defineEmits<{
  select: [id: string]
  toggle: [id: string]
}>()

function toggle(id: string) {
  emit('toggle', id)
}
</script>
