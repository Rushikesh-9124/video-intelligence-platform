const Video = require('../models/Video');
const AnalysisResult = require('../models/AnalysisResult');
const { analyzeVideo, checkHealth } = require('../services/mlService');

/**
 * POST /api/analysis/:videoId/start
 * Trigger ML analysis for a video.
 */
const startAnalysis = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    if (video.status === 'processing') {
      return res.status(409).json({ message: 'Analysis already in progress' });
    }

    if (video.status === 'completed') {
      const existing = await AnalysisResult.findOne({ videoId: video._id }).lean();
      if (existing) {
        return res.status(200).json({ message: 'Analysis already completed', result: existing });
      }
    }

    // Check ML service health
    const health = await checkHealth();
    if (!health.online) {
      return res.status(503).json({ message: 'ML Service is offline. Please ensure the FastAPI service is running.' });
    }

    // Set status to processing
    video.status = 'processing';
    await video.save();

    // Respond immediately, run analysis in background
    res.json({ message: 'Analysis started', videoId: video._id });

    // ── Background analysis ─────────────────────────────────────────────────
    (async () => {
      const startTime = Date.now();
      try {
        const result = await analyzeVideo(video.cloudinaryUrl, video.preferences);

        // Save result
        await AnalysisResult.findOneAndUpdate(
          { videoId: video._id },
          {
            videoId: video._id,
            scenes: result.scenes,
            totalScenes: result.scenes.length,
            processingTime: Date.now() - startTime,
            modelVersions: result.model_versions || {},
          },
          { upsert: true, new: true }
        );

        video.status = 'completed';
        await video.save();
        console.log(`✅ Analysis complete for video ${video._id} (${result.scenes.length} scenes)`);
      } catch (err) {
        console.error(`❌ Analysis failed for video ${video._id}:`, err.message);

        await AnalysisResult.findOneAndUpdate(
          { videoId: video._id },
          { videoId: video._id, scenes: [], error: err.message },
          { upsert: true, new: true }
        );

        video.status = 'failed';
        await video.save();
      }
    })();
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analysis/:videoId
 * Fetch analysis result + video status.
 */
const getAnalysisResult = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.videoId).lean();
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const result = await AnalysisResult.findOne({ videoId: video._id }).lean();

    res.json({
      videoId: video._id,
      status: video.status,
      preferences: video.preferences,
      result: result || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analysis/:videoId/scenes
 * Get filtered scenes based on mode + tags.
 */
const getFilteredScenes = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.videoId).lean();
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const result = await AnalysisResult.findOne({ videoId: video._id }).lean();
    if (!result) return res.status(404).json({ message: 'No analysis result found' });

    const { mode, sensitivity, parsedTags, filters } = video.preferences;

    // Confidence thresholds by sensitivity
    const confidenceThreshold = { low: 0.7, medium: 0.5, high: 0.3 }[sensitivity] || 0.5;

    // Filter scenes
    let filteredScenes = result.scenes.filter((s) => s.confidence >= confidenceThreshold);

    if (mode === 'avoid') {
      // Return scenes to warn/skip
      const avoidTags = buildAvoidTags(filters);
      filteredScenes = filteredScenes.filter((s) => s.tags.some((t) => avoidTags.includes(t)));
    } else {
      // Return scenes to highlight
      const findTags = parsedTags.length > 0 ? parsedTags : ['fight', 'action', 'emotional', 'funny'];
      filteredScenes = filteredScenes.filter((s) => s.tags.some((t) => findTags.includes(t)));
    }

    res.json({ mode, scenes: filteredScenes, total: filteredScenes.length });
  } catch (err) {
    next(err);
  }
};

/**
 * Build tags to avoid based on filter sliders.
 */
const buildAvoidTags = (filters) => {
  const tags = [];
  if (filters.violence > 0) tags.push('violence', 'fight');
  if (filters.blood > 0) tags.push('blood', 'gore');
  if (filters.nudity > 0) tags.push('nudity', 'sexual');
  if (filters.abuse > 0) tags.push('abuse', 'profanity');
  if (filters.horror > 0) tags.push('horror', 'scream');
  return tags;
};

/**
 * GET /api/analysis/health
 */
const mlHealthCheck = async (req, res, next) => {
  try {
    const health = await checkHealth();
    res.json(health);
  } catch (err) {
    next(err);
  }
};

module.exports = { startAnalysis, getAnalysisResult, getFilteredScenes, mlHealthCheck };
