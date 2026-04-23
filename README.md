# 🎬 Smart Multimodal Video Intelligence Platform

A production-ready AI platform that analyzes videos using **computer vision**, **audio signal processing**, **speech recognition**, and **NLP** — then lets users avoid sensitive content or jump to desired scenes.

---

## 🧠 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                         │
│  Upload → Preferences → Processing → Video Player               │
│  Timeline markers · Popup warnings · Scene navigation           │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────────┐
│                   BACKEND (Node.js + Express)                    │
│  /api/videos   - Upload, Cloudinary, MongoDB                    │
│  /api/analysis - Trigger ML, Poll status, Filtered scenes        │
└────────────────────────┬────────────────────────────────────────┘
          │ Cloudinary          │ POST /analyze-video
          ▼                     ▼
   ┌─────────────┐    ┌────────────────────────────────────────────┐
   │  Cloudinary │    │          ML SERVICE (FastAPI + Python)      │
   │  Video CDN  │    │                                            │
   └─────────────┘    │  ┌──────────────────────────────────────┐  │
                      │  │         MULTIMODAL PIPELINE          │  │
                      │  │                                      │  │
                      │  │  1. Scene Segmentation (PySceneDetect)│  │
                      │  │  2. Visual Analysis (ViT / Heuristics)│  │
                      │  │  3. Audio Extraction (ffmpeg)        │  │
                      │  │  4. Speech-to-Text (Whisper)         │  │
                      │  │  5. NLP (Transformers, BERT)         │  │
                      │  │  6. Audio Events (librosa)           │  │
                      │  │  7. Multimodal Fusion                │  │
                      │  └──────────────────────────────────────┘  │
                      └────────────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
video-intelligence/
├── backend/                    # Node.js + Express API
│   ├── controllers/
│   │   ├── videoController.js  # Upload, CRUD
│   │   └── analysisController.js # Trigger ML, fetch results
│   ├── routes/
│   │   ├── videoRoutes.js
│   │   └── analysisRoutes.js
│   ├── models/
│   │   ├── Video.js            # Mongoose schema
│   │   └── AnalysisResult.js   # Scene results schema
│   ├── services/
│   │   ├── cloudinaryService.js
│   │   └── mlService.js        # HTTP client for FastAPI
│   ├── utils/
│   │   └── errorHandler.js
│   └── server.js
│
├── ml-service/                 # Python FastAPI + ML
│   ├── api/
│   │   ├── routes.py           # /analyze-video, /parse-intent
│   │   └── schemas.py          # Pydantic models
│   ├── models/
│   │   └── loader.py           # Whisper + HuggingFace model registry
│   ├── pipelines/
│   │   ├── scene_segmentation.py
│   │   ├── vision_analysis.py  # ViT / heuristic visual analysis
│   │   ├── audio_analysis.py   # Whisper + librosa
│   │   ├── nlp_analysis.py     # Sentiment + zero-shot
│   │   ├── multimodal_fusion.py
│   │   ├── video_pipeline.py   # Orchestrator
│   │   └── intent_parser.py    # NLP intent → tags
│   ├── main.py
│   └── requirements.txt
│
└── frontend/                   # Next.js UI
    ├── app/                    # Next.js 14 app router
    ├── components/ui/          # Design system components
    ├── hooks/
    │   ├── useVideoStore.js    # Zustand global state
    │   └── useAnalysis.js      # Upload + polling lifecycle
    └── utils/
        └── apiClient.js        # Axios API client
```

---

## 🚀 Setup & Running

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB (local or Atlas)
- Cloudinary account
- ffmpeg installed (`brew install ffmpeg` / `apt install ffmpeg`)

---

### 1. Backend

```bash
cd backend
cp .env.example .env        # Fill in MongoDB URI + Cloudinary credentials
npm install
npm run dev                 # Starts on port 5000
```

---

### 2. ML Service

```bash
cd ml-service
cp .env.example .env
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Download Whisper model (happens automatically on first run)
python main.py              # Starts on port 8000
```

> ⏱️ First startup downloads ~150MB of model weights. Subsequent starts are fast.

**GPU acceleration (optional):**
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

---

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local    # Set NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev                         # Starts on port 3000
```

---

## 🧩 API Reference

### Video Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/videos/upload` | Upload video (multipart/form-data) |
| GET | `/api/videos/:id` | Get video metadata |
| PUT | `/api/videos/:id/preferences` | Update preferences |
| DELETE | `/api/videos/:id` | Delete video |
| GET | `/api/videos` | List all videos |

### Analysis Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analysis/:videoId/start` | Trigger ML analysis |
| GET | `/api/analysis/:videoId` | Get analysis result + status |
| GET | `/api/analysis/:videoId/scenes/filtered` | Get scenes filtered by mode |
| GET | `/api/analysis/health` | ML service health check |

### ML Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze-video` | Run full multimodal pipeline |
| POST | `/parse-intent` | NLP → content tags |
| GET | `/health` | Service health |

---

## 🎯 Output Format (Scene JSON)

```json
[
  {
    "start": 120.5,
    "end": 138.2,
    "tags": ["violence", "fight"],
    "source": ["video", "audio"],
    "confidence": 0.91,
    "thumbnail": "<base64-jpeg>",
    "transcript": "You'll never take me alive!",
    "sentiment": "negative"
  }
]
```

---

## 🔧 Configuration

### Sensitivity Levels

| Level | Confidence Threshold | Description |
|-------|----------------------|-------------|
| Low | 0.70 | Only flag high-certainty scenes |
| Medium | 0.50 | Balanced detection |
| High | 0.30 | Flag borderline scenes too |

### Whisper Model Sizes

| Model | VRAM | WER | Speed |
|-------|------|-----|-------|
| tiny | ~1GB | Higher | Fast |
| base | ~1GB | Good | Fast |
| small | ~2GB | Better | Medium |
| medium | ~5GB | Best | Slow |

---

## ⚡ Performance Tips

1. **Use GPU** if available — analysis is 10-20x faster
2. **Whisper `base`** is a good balance for most use cases
3. **Scene detection threshold**: lower value = more scenes = slower but finer analysis
4. **Backend polling interval**: 3 seconds by default, increase for long videos

---

## 🔒 Environment Variables

### Backend `.env`
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/video-intelligence
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
ML_SERVICE_URL=http://localhost:8000
```

### Frontend `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🗺️ Roadmap

- [ ] Real-time WebSocket progress updates
- [ ] Scene thumbnail grid view
- [ ] Highlight reel auto-generation (ffmpeg)
- [ ] Subtitle export with scene markers (.srt)
- [ ] User authentication (JWT)
- [ ] Batch video processing queue (Bull)
- [ ] Custom model fine-tuning endpoint
