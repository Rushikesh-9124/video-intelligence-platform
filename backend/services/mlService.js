const axios = require('axios');

const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Axios instance with timeout
const mlClient = axios.create({
  baseURL: ML_BASE_URL,
  timeout: 600_000, // 10 minutes — video analysis is slow
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Submit a video for multimodal analysis.
 * @param {string} videoUrl - Cloudinary video URL
 * @param {object} preferences - User preferences from DB
 * @returns {Promise<{scenes: Array, processingTime: number, modelVersions: object}>}
 */
const analyzeVideo = async (videoUrl, preferences) => {
  try {
    const payload = {
      video_url: videoUrl,
      mode: preferences.mode,
      sensitivity: preferences.sensitivity,
      filters: preferences.filters,
      audio_preferences: preferences.audioPreferences,
      parsed_tags: preferences.parsedTags || [],
    };

    const response = await mlClient.post('/analyze-video', payload);
    return response.data;
  } catch (err) {
    if (err.response) {
      throw new Error(`ML Service error ${err.response.status}: ${JSON.stringify(err.response.data)}`);
    } else if (err.code === 'ECONNREFUSED') {
      throw new Error('ML Service is not running. Please start the FastAPI service.');
    }
    throw new Error(`ML Service request failed: ${err.message}`);
  }
};

/**
 * Check ML service health.
 */
const checkHealth = async () => {
  try {
    const { data } = await mlClient.get('/health', { timeout: 5000 });
    return { online: true, ...data };
  } catch {
    return { online: false };
  }
};

/**
 * Parse natural language input into structured tags via ML NLP endpoint.
 * @param {string} naturalInput - e.g. "Show only fight scenes"
 * @returns {Promise<string[]>} - e.g. ["fight", "action"]
 */
const parseNaturalInput = async (naturalInput) => {
  try {
    const { data } = await mlClient.post('/parse-intent', { text: naturalInput });
    return data.tags || [];
  } catch {
    // Fallback: simple keyword extraction
    return extractKeywordsFallback(naturalInput);
  }
};

/**
 * Simple keyword-based fallback for intent parsing.
 */
const extractKeywordsFallback = (text) => {
  const lower = text.toLowerCase();
  const tagMap = {
    fight: ['fight', 'fighting', 'brawl', 'combat'],
    action: ['action', 'chase', 'run', 'explosion'],
    emotional: ['emotional', 'sad', 'cry', 'touching', 'heartfelt'],
    funny: ['funny', 'humor', 'laugh', 'comedy', 'comic'],
    dialogue: ['dialogue', 'conversation', 'talk', 'speech'],
    violence: ['violence', 'violent', 'brutal'],
    horror: ['horror', 'scary', 'frightening'],
    nudity: ['nudity', 'sexual', 'explicit'],
    boring: ['boring', 'slow', 'skip'],
  };

  const detected = [];
  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      detected.push(tag);
    }
  }
  return detected;
};

module.exports = { analyzeVideo, checkHealth, parseNaturalInput };
