const { validationResult } = require('express-validator');
const Video = require('../models/Video');
const { uploadVideo, deleteVideo } = require('../services/cloudinaryService');
const { parseNaturalInput } = require('../services/mlService');

/**
 * POST /api/videos/upload
 * Upload video to Cloudinary, save metadata to DB.
 */
const uploadVideoController = async (req, res, next) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided' });
    }

    // Parse preferences from form body
    const preferences = JSON.parse(req.body.preferences || '{}');
    const { mode = 'avoid', sensitivity = 'medium', filters = {}, audioPreferences = {}, naturalInput = '' } = preferences;

    if (!['avoid', 'find'].includes(mode)) {
      return res.status(400).json({ message: 'Mode must be "avoid" or "find"' });
    }

    // Parse natural language input into tags
    let parsedTags = [];
    if (naturalInput.trim()) {
      parsedTags = await parseNaturalInput(naturalInput);
    }

    // Upload to Cloudinary
    console.log(`📤 Uploading video to Cloudinary: ${req.file.originalname}`);
    const { url, publicId, duration, size } = await uploadVideo(req.file.buffer, req.file.originalname);

    // Save to DB
    const video = await Video.create({
      title: req.body.title || req.file.originalname,
      cloudinaryUrl: url,
      cloudinaryPublicId: publicId,
      duration,
      fileSize: size,
      status: 'uploaded',
      preferences: {
        mode,
        sensitivity,
        filters: {
          violence: filters.violence ?? 3,
          blood: filters.blood ?? 3,
          nudity: filters.nudity ?? 3,
          abuse: filters.abuse ?? 3,
          horror: filters.horror ?? 3,
        },
        audioPreferences: {
          detectAbusiveLanguage: audioPreferences.detectAbusiveLanguage ?? true,
          detectScreaming: audioPreferences.detectScreaming ?? true,
          detectLoudNoises: audioPreferences.detectLoudNoises ?? true,
          detectEmotionalTone: audioPreferences.detectEmotionalTone ?? true,
        },
        naturalInput,
        parsedTags,
      },
    });

    res.status(201).json({
      message: 'Video uploaded successfully',
      videoId: video._id,
      cloudinaryUrl: url,
      parsedTags,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/videos/:id
 * Fetch video metadata by ID.
 */
const getVideoById = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).lean();
    if (!video) return res.status(404).json({ message: 'Video not found' });
    res.json(video);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/videos/:id/preferences
 * Update preferences for a video (before analysis).
 */
const updatePreferences = async (req, res, next) => {
  try {
    const { preferences } = req.body;
    if (!preferences) return res.status(400).json({ message: 'Preferences required' });

    // Re-parse natural input if updated
    if (preferences.naturalInput) {
      preferences.parsedTags = await parseNaturalInput(preferences.naturalInput);
    }

    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { preferences },
      { new: true, runValidators: true }
    );

    if (!video) return res.status(404).json({ message: 'Video not found' });
    res.json({ message: 'Preferences updated', video });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/videos/:id
 * Remove video from Cloudinary and DB.
 */
const deleteVideoController = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    await deleteVideo(video.cloudinaryPublicId);
    await video.deleteOne();

    res.json({ message: 'Video deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/videos
 * List all videos (paginated).
 */
const listVideos = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      Video.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Video.countDocuments(),
    ]);

    res.json({ videos, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadVideoController, getVideoById, updatePreferences, deleteVideoController, listVideos };
