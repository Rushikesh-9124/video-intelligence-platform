import os
import torch
import asyncio
from typing import Optional


class ModelLoader:
    """Singleton model registry. Models are loaded once at startup."""

    _ready = False

    whisper_model = None
    sentiment_pipeline = None
    zero_shot_pipeline = None
    audio_classifier = None

    device = "cpu"

    # ── INIT ───────────────────────────────────────────────────
    @classmethod
    async def initialize(cls):
        """Load all models safely at startup."""
        cls.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"  🖥️  Using device: {cls.device}")

        try:
            # Run blocking loads in threads
            await asyncio.to_thread(cls._load_whisper)
            await asyncio.to_thread(cls._load_nlp_models)
            await asyncio.to_thread(cls._load_audio_model)

            cls._ready = True
            print("  🚀 All models initialized successfully")

        except Exception as e:
            print(f"  ❌ Model initialization failed: {e}")
            cls._ready = False

    # ── WHISPER ────────────────────────────────────────────────
    @classmethod
    def _load_whisper(cls):
        try:
            import whisper

            model_size = os.getenv("WHISPER_MODEL", "base")
            print(f"  📝 Loading Whisper ({model_size})...")

            cls.whisper_model = whisper.load_model(
                model_size,
                device=cls.device
            )

            print("  ✅ Whisper loaded")

        except Exception as e:
            print(f"  ⚠️ Whisper failed: {e}")
            cls.whisper_model = None

    # ── NLP MODELS ─────────────────────────────────────────────
    @classmethod
    def _load_nlp_models(cls):
        try:
            from transformers import pipeline

            device_id = 0 if cls.device == "cuda" else -1

            print("  🧠 Loading sentiment model...")
            cls.sentiment_pipeline = pipeline(
                "text-classification",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                device=device_id,
            )

            print("  🏷️ Loading zero-shot model...")
            cls.zero_shot_pipeline = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
                device=device_id,
            )

            print("  ✅ NLP models loaded")

        except Exception as e:
            print(f"  ⚠️ NLP models failed: {e}")
            cls.sentiment_pipeline = None
            cls.zero_shot_pipeline = None

    # ── AUDIO CLASSIFIER (NEW) ─────────────────────────────────
    @classmethod
    def _load_audio_model(cls):
        """Basic audio event classifier (placeholder but useful)."""
        try:
            from transformers import pipeline

            device_id = 0 if cls.device == "cuda" else -1

            print("  🔊 Loading audio classifier...")

            cls.audio_classifier = pipeline(
                "audio-classification",
                model="superb/wav2vec2-base-superb-ks",
                device=device_id,
            )

            print("  ✅ Audio model loaded")

        except Exception as e:
            print(f"  ⚠️ Audio model failed: {e}")
            cls.audio_classifier = None

    # ── STATUS ────────────────────────────────────────────────
    @classmethod
    def is_ready(cls) -> bool:
        return cls._ready

    # ── CLEANUP (VERY IMPORTANT) ──────────────────────────────
    @classmethod
    async def cleanup(cls):
        """Free memory / GPU."""
        try:
            print("  🧹 Cleaning up models...")

            cls.whisper_model = None
            cls.sentiment_pipeline = None
            cls.zero_shot_pipeline = None
            cls.audio_classifier = None

            if torch.cuda.is_available():
                torch.cuda.empty_cache()

            print("  ✅ Cleanup complete")

        except Exception as e:
            print(f"  ⚠️ Cleanup error: {e}")