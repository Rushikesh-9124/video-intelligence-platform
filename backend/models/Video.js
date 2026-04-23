const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'Untitled Video',
      trim: true,
    },
    cloudinaryUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // seconds
      default: 0,
    },
    fileSize: {
      type: Number, // bytes
      default: 0,
    },
    status: {
      type: String,
      enum: ['uploaded', 'queued', 'processing', 'completed', 'failed'],
      default: 'uploaded',
    },
    preferences: {
      mode: { type: String, enum: ['avoid', 'find'], required: true },
      sensitivity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
      filters: {
        violence: { type: Number, min: 0, max: 5, default: 3 },
        blood: { type: Number, min: 0, max: 5, default: 3 },
        nudity: { type: Number, min: 0, max: 5, default: 3 },
        abuse: { type: Number, min: 0, max: 5, default: 3 },
        horror: { type: Number, min: 0, max: 5, default: 3 },
      },
      audioPreferences: {
        detectAbusiveLanguage: { type: Boolean, default: true },
        detectScreaming: { type: Boolean, default: true },
        detectLoudNoises: { type: Boolean, default: true },
        detectEmotionalTone: { type: Boolean, default: true },
      },
      naturalInput: { type: String, default: '' },
      parsedTags: [String], // tags derived from naturalInput
    },
    analysisJobId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Video', videoSchema);
