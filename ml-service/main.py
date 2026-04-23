import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from api.routes import router
from models.loader import ModelLoader

# ── Load env ───────────────────────────────────────────────────
load_dotenv()

# ── Lifespan (startup / shutdown) ──────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔄 Loading ML models...")

    start = time.time()

    try:
        # ✅ Load models ONCE at startup
        await ModelLoader.initialize()

        if not ModelLoader.is_ready():
            raise RuntimeError("ModelLoader failed to initialize models")

        print(f"✅ Models loaded in {time.time() - start:.1f}s")

    except Exception as e:
        print("❌ Failed to load models:", str(e))
        raise e  # crash app — better than running broken

    yield

    # ── Shutdown cleanup ───────────────────────────────────────
    print("🛑 Shutting down ML service")

    try:
        await ModelLoader.cleanup()
    except Exception:
        pass


# ── FastAPI App ───────────────────────────────────────────────
app = FastAPI(
    title="Video Intelligence ML Service",
    description="Multimodal video analysis: vision, audio, speech, NLP",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (restrict later in prod) ─────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────────
app.include_router(router)


# ── Health check ─────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok" if ModelLoader.is_ready() else "not_ready",
        "models_loaded": ModelLoader.is_ready(),
        "timestamp": time.time(),
    }


# ── Run server ───────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=False, 
        workers=1,    
    )