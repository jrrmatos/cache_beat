<template>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm text-zinc-400">Output Path</label>
      <input
        v-model="form.outputPath"
        type="text"
        placeholder="Leave empty for default"
        class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
      >
    </div>
    <div>
      <label class="mb-1 block text-sm text-zinc-400">Sync Frequency</label>
      <select
        v-model="form.syncFrequency"
        class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
      >
        <option value="hourly">
          Hourly
        </option>
        <option value="daily">
          Daily
        </option>
        <option value="weekly">
          Weekly
        </option>
        <option value="manual">
          Manual
        </option>
      </select>
    </div>
    <div>
      <label class="mb-1 block text-sm text-zinc-400">Audio Quality (0 = best, 10 = worst)</label>
      <input
        v-model="form.audioQuality"
        type="text"
        class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
const form = defineModel<{
  outputPath: string | null
  syncFrequency: string
  audioQuality: string
}>({ required: true })
</script>
