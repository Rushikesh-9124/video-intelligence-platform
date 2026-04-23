import axios, { AxiosError } from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 600_000, // 10 min for large uploads
})

// ── Response interceptor ─────────────────────────────────────
http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<any>) => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'An unexpected error occurred'

    return Promise.reject(new Error(message))
  }
)

// ── TYPES ───────────────────────────────────────────────────
export type UploadResponse = {
  videoId: string
  cloudinaryUrl: string
}

// ── API CLIENT ───────────────────────────────────────────────
export const apiClient = {
  // 🔹 Upload video
  uploadVideo: async (
    formData: FormData,
    onProgress?: (pct: number) => void
  ): Promise<UploadResponse> => {
    const res = await http.post('/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },

      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          const pct = Math.round((evt.loaded / evt.total) * 100)
          onProgress(pct)
        }
      },
    })

    return res.data
  },

  // 🔹 Get video
  getVideo: async (id: string) => {
    const res = await http.get(`/videos/${id}`)
    return res.data
  },

  // 🔹 Update preferences
  updatePreferences: async (id: string, preferences: object) => {
    const res = await http.put(`/videos/${id}/preferences`, { preferences })
    return res.data
  },

  // 🔹 Start analysis
  startAnalysis: async (videoId: string) => {
    const res = await http.post(`/analysis/${videoId}/start`)
    return res.data
  },

  // 🔹 Get analysis
  getAnalysis: async (videoId: string) => {
    const res = await http.get(`/analysis/${videoId}`)
    return res.data
  },

  // 🔹 Get filtered scenes
  getFilteredScenes: async (videoId: string) => {
    const res = await http.get(`/analysis/${videoId}/scenes/filtered`)
    return res.data
  },

  // 🔹 Parse user intent
  parseIntent: async (text: string): Promise<string[]> => {
    const res = await http.post(
      '/videos/parse-intent',
      { text },
      {
        baseURL: process.env.NEXT_PUBLIC_ML_URL || 'http://localhost:8001',
      }
    )
    return res.data.tags || []
  },

  // 🔹 Health check
  checkMlHealth: async () => {
    const res = await http.get('/analysis/health')
    return res.data
  },

  // 🔹 List videos
  listVideos: async (page = 1, limit = 10) => {
    const res = await http.get(`/videos?page=${page}&limit=${limit}`)
    return res.data
  },
}