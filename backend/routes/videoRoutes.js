const express = require('express');
const multer = require('multer');
const { body } = require('express-validator');
const {
  uploadVideoController,
  getVideoById,
  updatePreferences,
  deleteVideoController,
  listVideos,
} = require('../controllers/videoController');

const router = express.Router();

// Multer: store in memory, then stream to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/avi', 'video/quicktime', 'video/x-matroska'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

// ── Routes ──────────────────────────────────────────────────────────────────
router.get('/', listVideos);
router.post('/upload', upload.single('video'), uploadVideoController);
router.get('/:id', getVideoById);
router.put('/:id/preferences', updatePreferences);
router.delete('/:id', deleteVideoController);

module.exports = router;
