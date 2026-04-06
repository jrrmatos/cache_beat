<template>
  <div class="mx-auto max-w-2xl space-y-8">
    <h1 class="text-2xl font-bold">
      Settings
    </h1>

    <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 class="mb-4 text-lg font-semibold">
        YouTube Connection
      </h2>

      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-sm text-zinc-400">Client ID</label>
          <input
            v-model="form.youtube_client_id"
            type="text"
            placeholder="Google OAuth Client ID"
            class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
        </div>
        <div>
          <label class="mb-1 block text-sm text-zinc-400">Client Secret</label>
          <input
            v-model="form.youtube_client_secret"
            type="password"
            placeholder="Google OAuth Client Secret"
            class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
        </div>
        <button
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500"
          @click="saveCredentials"
        >
          Save Credentials
        </button>
      </div>

      <div class="mt-6 border-t border-zinc-800 pt-4">
        <div class="flex items-center gap-3">
          <span
            class="inline-block h-2.5 w-2.5 rounded-full"
            :class="youtubeConnected ? 'bg-emerald-400' : 'bg-red-400'"
          />
          <span class="text-sm">
            {{ youtubeConnected ? 'YouTube connected' : 'YouTube not connected' }}
          </span>
          <button
            v-if="! youtubeConnected"
            class="ml-auto rounded-lg border border-zinc-700 px-4 py-2 text-sm transition-colors hover:bg-zinc-800"
            @click="connectYoutube"
          >
            Connect YouTube
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 class="mb-4 text-lg font-semibold">
        Defaults
      </h2>
      <div>
        <label class="mb-1 block text-sm text-zinc-400">Default Output Path</label>
        <input
          v-model="form.default_output_path"
          type="text"
          placeholder="~/Music/CacheBeat"
          class="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
      </div>
      <button
        class="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-emerald-500"
        @click="saveDefaults"
      >
        Save Defaults
      </button>
    </div>

    <div
      v-if="message"
      class="rounded-lg bg-emerald-900/30 p-3 text-sm text-emerald-300"
    >
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
const { get, put } = useApi()
const route = useRoute()

const form = ref({
  youtube_client_id: '',
  youtube_client_secret: '',
  default_output_path: '',
})
const youtubeConnected = ref(false)
const message = ref('')

async function loadSettings() {
  try {
    const data = await get<Record<string, string | null>>('/api/settings')
    form.value.youtube_client_id = data.youtube_client_id ?? ''
    form.value.default_output_path = data.default_output_path ?? ''
  }
  catch {
    // settings may not exist yet
  }

  try {
    const status = await get<{ connected: boolean }>('/api/auth/youtube/status')
    youtubeConnected.value = status.connected
  }
  catch {
    youtubeConnected.value = false
  }
}

async function saveCredentials() {
  await put('/api/settings', {
    youtube_client_id: form.value.youtube_client_id,
    youtube_client_secret: form.value.youtube_client_secret,
  })
  message.value = 'Credentials saved'
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

async function saveDefaults() {
  await put('/api/settings', {
    default_output_path: form.value.default_output_path,
  })
  message.value = 'Defaults saved'
  setTimeout(() => {
    message.value = ''
  }, 3000)
}

async function connectYoutube() {
  const data = await get<{ url: string }>('/api/auth/youtube/url')
  window.location.href = data.url
}

onMounted(() => {
  loadSettings()
  if (route.query.youtube === 'connected') {
    message.value = 'YouTube connected successfully!'
    setTimeout(() => {
      message.value = ''
    }, 5000)
  }
})
</script>
