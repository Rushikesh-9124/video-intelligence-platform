const express = require('express');
const { startAnalysis, getAnalysisResult, getFilteredScenes, mlHealthCheck } = require('../controllers/analysisController');

const router = express.Router();

router.get('/health', mlHealthCheck);
router.post('/:videoId/start', startAnalysis);
router.get('/:videoId', getAnalysisResult);
router.get('/:videoId/scenes/filtered', getFilteredScenes);

module.exports = router;
