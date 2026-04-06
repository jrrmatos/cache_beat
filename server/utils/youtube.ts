import { google, type youtube_v3 } from 'googleapis'
import { getSetting, setSetting } from './settings'

const REDIRECT_URI = 'http://localhost:3000/api/auth/youtube/callback'

async function getOAuth2Client() {
  const clientId = await getSetting('youtube_client_id')
  const clientSecret = await getSetting('youtube_client_secret')
  if (! clientId || ! clientSecret) {
    throw createError({ statusCode: 400, message: 'YouTube OAuth credentials not configured' })
  }
  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)
}

async function getAuthenticatedClient() {
  const oauth2 = await getOAuth2Client()
  const accessToken = await getSetting('youtube_access_token')
  const refreshToken = await getSetting('youtube_refresh_token')
  if (! refreshToken) {
    throw createError({ statusCode: 401, message: 'YouTube not connected' })
  }
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  oauth2.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await setSetting('youtube_access_token', tokens.access_token)
    }
    if (tokens.refresh_token) {
      await setSetting('youtube_refresh_token', tokens.refresh_token)
    }
  })
  return oauth2
}

function youtubeClient(auth: InstanceType<typeof google.auth.OAuth2>): youtube_v3.Youtube {
  return google.youtube({ version: 'v3', auth })
}

export async function getAuthUrl(): Promise<string> {
  const oauth2 = await getOAuth2Client()
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/youtube.readonly',
    ],
  })
}

export async function exchangeCode(code: string) {
  const oauth2 = await getOAuth2Client()
  const { tokens } = await oauth2.getToken(code)
  if (tokens.access_token) {
    await setSetting('youtube_access_token', tokens.access_token)
  }
  if (tokens.refresh_token) {
    await setSetting('youtube_refresh_token', tokens.refresh_token)
  }
  return tokens
}

export async function getYoutubePlaylists(pageToken?: string) {
  const auth = await getAuthenticatedClient()
  const yt = youtubeClient(auth)
  const response = await yt.playlists.list({
    part: ['snippet', 'contentDetails'],
    mine: true,
    maxResults: 50,
    pageToken,
  })
  return response.data
}

export async function getPlaylistItems(playlistId: string, pageToken?: string) {
  const auth = await getAuthenticatedClient()
  const yt = youtubeClient(auth)
  const response = await yt.playlistItems.list({
    part: ['snippet', 'contentDetails'],
    playlistId,
    maxResults: 50,
    pageToken,
  })
  return response.data
}

export async function getAllPlaylistItems(playlistId: string) {
  const items: youtube_v3.Schema$PlaylistItem[] = []
  let pageToken: string | undefined

  do {
    const response = await getPlaylistItems(playlistId, pageToken)
    if (response.items) {
      items.push(...response.items)
    }
    pageToken = response.nextPageToken ?? undefined
  } while (pageToken)

  return items
}

export async function getLikedVideos(pageToken?: string) {
  const auth = await getAuthenticatedClient()
  const yt = youtubeClient(auth)
  const response = await yt.videos.list({
    part: ['snippet', 'contentDetails'],
    myRating: 'like',
    maxResults: 50,
    pageToken,
  })
  return response.data
}

export async function searchVideos(query: string, pageToken?: string) {
  const auth = await getAuthenticatedClient()
  const yt = youtubeClient(auth)
  const response = await yt.search.list({
    part: ['snippet'],
    q: query,
    type: ['video'],
    maxResults: 25,
    pageToken,
  })
  return response.data
}

export async function isYoutubeConnected(): Promise<boolean> {
  const refreshToken = await getSetting('youtube_refresh_token')
  return !! refreshToken
}
