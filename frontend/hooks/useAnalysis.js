/**
 * useAnalysis hook
 * Manages the full video upload → analysis → result lifecycle.
 */
import { useCallback } from 'react';
import { uploadVideo, startAnalysis, pollAnalysis } from '../utils/apiClient';
import { useVideoStore } from './useVideoStore';

export const useAnalysis = () => {
  const {
    videoFile, preferences,
    setVideoId, setCloudinaryUrl, setAnalysisStatus,
    setUploadProgress, setScenes, setError, setStep,
  } = useVideoStore();

  /**
   * Run the full pipeline:
   * 1. Upload to Cloudinary via backend
   * 2. Trigger ML analysis
   * 3. Poll until done
   * 4. Load scenes into store
   */
  const runPipeline = useCallback(async () => {
    if (!videoFile || !preferences) return;

    try {
      // ── Step 1: Upload video ─────────────────────────────────────────────
      setAnalysisStatus('uploading');
      setError(null);

      const uploadResult = await uploadVideo(
        videoFile,
        preferences,
        (progress) => setUploadProgress(progress),
      );

      setVideoId(uploadResult.videoId);
      setCloudinaryUrl(uploadResult.cloudinaryUrl);

      // ── Step 2: Trigger analysis ─────────────────────────────────────────
      setAnalysisStatus('queued');
      await startAnalysis(uploadResult.videoId);
      setAnalysisStatus('processing');

      // ── Step 3: Poll for completion ──────────────────────────────────────
      const result = await pollAnalysis(
        uploadResult.videoId,
        (status) => setAnalysisStatus(status),
        3000,
      );

      // ── Step 4: Load scenes ──────────────────────────────────────────────
      const scenes = result.result?.scenes || [];
      setScenes(scenes);
      setAnalysisStatus('completed');
      setStep(3);
    } catch (err) {
      console.error('Pipeline error:', err);
      setError(err.message);
      setAnalysisStatus('failed');
    }
  }, [videoFile, preferences, setVideoId, setCloudinaryUrl, setAnalysisStatus, setUploadProgress, setScenes, setError, setStep]);

  return { runPipeline };
};
