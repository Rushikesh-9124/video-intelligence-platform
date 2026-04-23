/**
 * Global state management using Zustand.
 * Tracks the full lifecycle: upload → preferences → processing → player.
 */
import { create } from 'zustand';

export const useVideoStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  step: 0,                  // 0=upload, 1=preferences, 2=processing, 3=player
  videoId: null,            // MongoDB document ID
  videoFile: null,          // Local File object
  cloudinaryUrl: null,      // Uploaded video URL
  preferences: null,        // User-selected preferences
  analysisStatus: 'idle',   // idle | uploading | queued | processing | completed | failed
  uploadProgress: 0,
  scenes: [],               // Analyzed scene list
  activeScene: null,        // Currently highlighted scene
  currentTime: 0,           // Video playback position
  error: null,

  // ── Actions ───────────────────────────────────────────────────────────────
  setStep: (step) => set({ step }),

  setVideoFile: (file) => set({ videoFile: file }),

  setPreferences: (preferences) => set({ preferences }),

  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  setAnalysisStatus: (status) => set({ analysisStatus: status }),

  setVideoId: (id) => set({ videoId: id }),

  setCloudinaryUrl: (url) => set({ cloudinaryUrl: url }),

  setScenes: (scenes) => set({ scenes }),

  setActiveScene: (scene) => set({ activeScene: scene }),

  setCurrentTime: (t) => set({ currentTime: t }),

  setError: (error) => set({ error }),

  // Reset everything
  reset: () => set({
    step: 0, videoId: null, videoFile: null, cloudinaryUrl: null,
    preferences: null, analysisStatus: 'idle', uploadProgress: 0,
    scenes: [], activeScene: null, currentTime: 0, error: null,
  }),

  // Derived: get scenes relevant to current mode
  getDisplayScenes: () => {
    const { scenes, preferences } = get();
    if (!preferences || !scenes.length) return scenes;

    const AVOID_TAGS = new Set(['violence', 'blood', 'nudity', 'horror', 'profanity', 'scream', 'explosion', 'gunshot']);
    const FIND_TAGS = new Set(['action', 'fight', 'funny', 'emotional', 'laughter']);

    if (preferences.mode === 'avoid') {
      return scenes.filter(s => s.tags.some(t => AVOID_TAGS.has(t)));
    } else {
      const targets = preferences.parsedTags?.length > 0
        ? new Set(preferences.parsedTags)
        : FIND_TAGS;
      return scenes.filter(s => s.tags.some(t => targets.has(t)));
    }
  },
}));
