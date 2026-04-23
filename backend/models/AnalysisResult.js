const mongoose = require('mongoose');

const sceneSchema = new mongoose.Schema({
  start: { type: Number, required: true },   // seconds
  end: { type: Number, required: true },     // seconds
  tags: [{ type: String }],
  source: [{ type: String, enum: ['video', 'audio', 'text'] }],
  confidence: { type: Number, min: 0, max: 1 },
  thumbnail: { type: String },               // base64 or URL
  transcript: { type: String, default: '' }, // speech in this scene
  sentiment: { type: String, default: '' },  // positive/negative/neutral
});

const analysisResultSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
      index: true,
    },
    scenes: [sceneSchema],
    totalScenes: { type: Number, default: 0 },
    processingTime: { type: Number }, // ms
    modelVersions: {
      vision: { type: String },
      audio: { type: String },
      nlp: { type: String },
      whisper: { type: String },
    },
    error: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AnalysisResult', analysisResultSchema);
