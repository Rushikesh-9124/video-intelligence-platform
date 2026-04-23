"""
Full multimodal video analysis pipeline.

Orchestrates:
1. Video download
2. Scene segmentation
3. Per-scene: visual + audio + speech analysis
4. Multimodal fusion
5. Return structured scene list
"""
import os
import tempfile
import asyncio
import requests
from typing import List, Tuple, Dict

from api.schemas import AnalyzeRequest, SceneResult
from models.loader import ModelLoader
from pipelines.scene_segmentation import segment_scenes, extract_keyframe
from pipelines.vision_analysis import analyze_scene_visually
from pipelines.audio_analysis import extract_audio, transcribe_audio, detect_audio_events
from pipelines.nlp_analysis import analyze_transcript
from pipelines.multimodal_fusion import fuse_signals


async def run_full_pipeline(request: AnalyzeRequest) -> Tuple[List[SceneResult], Dict]:
    """
    Main pipeline entry point.

    Returns:
        (scenes, model_versions)
    """
    video_path = None
    audio_path = None
    tmp_dir = tempfile.mkdtemp()

    try:
        # ── Step 1: Download video ────────────────────────────────────────────
        print(f"⬇️  Downloading video from {request.video_url[:80]}...")
        video_path = await asyncio.to_thread(_download_video, request.video_url, tmp_dir)
        print(f"✅ Video downloaded: {os.path.getsize(video_path) / 1e6:.1f} MB")

        # ── Step 2: Extract audio ─────────────────────────────────────────────
        print("🎵 Extracting audio track...")
        audio_path = os.path.join(tmp_dir, "audio.wav")
        audio_path = await asyncio.to_thread(extract_audio, video_path, audio_path)

        # ── Step 3: Scene segmentation ────────────────────────────────────────
        print("✂️  Segmenting scenes...")
        scenes_raw = await asyncio.to_thread(segment_scenes, video_path)
        print(f"  Found {len(scenes_raw)} scenes")

        # ── Step 4: Transcribe audio (full video, then map to scenes) ─────────
        print("📝 Running Whisper speech-to-text...")
        whisper_segments = await asyncio.to_thread(
            transcribe_audio,
            audio_path,
            ModelLoader.whisper_model,
        )

        # ── Step 5: Process each scene ────────────────────────────────────────
        print("🔍 Analyzing scenes...")
        scene_results: List[SceneResult] = []

        audio_prefs = request.audio_preferences.model_dump() if hasattr(request.audio_preferences, 'model_dump') else dict(request.audio_preferences)

        for i, (start, end) in enumerate(scenes_raw):
            # Visual analysis
            vision_result = await asyncio.to_thread(
                analyze_scene_visually,
                video_path, start, end,
                None,  # no model loaded yet — uses heuristics
                ModelLoader.device,
            )

            # Audio event detection
            audio_result = await asyncio.to_thread(
                detect_audio_events,
                audio_path, start, end, audio_prefs,
            )

            # Get transcript for this time range
            scene_text = _get_scene_transcript(whisper_segments, start, end)

            # NLP on transcript
            nlp_result = await asyncio.to_thread(
                analyze_transcript,
                scene_text,
                ModelLoader.sentiment_pipeline,
                ModelLoader.zero_shot_pipeline,
                audio_prefs,
            )

            # Multimodal fusion
            fused = fuse_signals(vision_result, audio_result, nlp_result)

            # Skip scenes with no detected content
            if not fused["tags"] and fused["confidence"] < 0.1:
                continue

            # Extract thumbnail
            mid_sec = (start + end) / 2
            thumbnail = await asyncio.to_thread(extract_keyframe, video_path, mid_sec)

            scene_results.append(SceneResult(
                start=round(start, 2),
                end=round(end, 2),
                tags=fused["tags"],
                source=fused["source"],
                confidence=fused["confidence"],
                thumbnail=thumbnail,
                transcript=scene_text[:500],  # trim long transcripts
                sentiment=fused.get("sentiment", "neutral"),
            ))

            if (i + 1) % 10 == 0:
                print(f"  Processed {i + 1}/{len(scenes_raw)} scenes...")

        print(f"✅ Pipeline complete: {len(scene_results)} tagged scenes from {len(scenes_raw)} total")

        model_versions = {
            "whisper": "openai/whisper-base" if ModelLoader.whisper_model else "disabled",
            "nlp": "cardiffnlp/twitter-roberta-base-sentiment" if ModelLoader.sentiment_pipeline else "disabled",
            "zero_shot": "facebook/bart-large-mnli" if ModelLoader.zero_shot_pipeline else "disabled",
            "vision": "heuristic",
        }

        return scene_results, model_versions

    finally:
        # ── Cleanup temp files ────────────────────────────────────────────────
        for path in [video_path, audio_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass
        try:
            os.rmdir(tmp_dir)
        except Exception:
            pass


def _download_video(url: str, tmp_dir: str) -> str:
    """Download a video from URL to a temp file."""
    ext = url.split("?")[0].rsplit(".", 1)[-1] if "." in url else "mp4"
    out_path = os.path.join(tmp_dir, f"video.{ext}")

    with requests.get(url, stream=True, timeout=300) as r:
        r.raise_for_status()
        with open(out_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    return out_path


def _get_scene_transcript(segments: List[Dict], start: float, end: float) -> str:
    """Extract transcript text for a given time range."""
    texts = []
    for seg in segments:
        seg_start = seg["start"]
        seg_end = seg["end"]
        # Include segment if it overlaps with the scene
        if seg_start < end and seg_end > start:
            texts.append(seg["text"])
    return " ".join(texts).strip()
