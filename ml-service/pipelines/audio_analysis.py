"""
Audio analysis pipeline:
1. Extract audio from video (ffmpeg via pydub)
2. Run Whisper speech-to-text
3. Detect non-speech audio events (screams, explosions, laughter, gunshots)
"""
import os
import subprocess
import tempfile
import numpy as np
import librosa
from typing import Tuple, List, Dict, Optional


def extract_audio(video_path: str, output_path: Optional[str] = None) -> str:
    """
    Extract audio track from video using ffmpeg.

    Returns:
        Path to extracted WAV file
    """
    if output_path is None:
        fd, output_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-ac", "1",           # mono
        "-ar", "16000",       # 16kHz (Whisper requirement)
        "-vn",                # no video
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg audio extraction failed: {result.stderr}")

    return output_path


def transcribe_audio(audio_path: str, whisper_model, language: str = None) -> List[Dict]:
    """
    Transcribe audio using Whisper, returning timestamped segments.

    Returns:
        List of {start, end, text} dicts
    """
    if whisper_model is None:
        return []

    options = {"task": "transcribe", "verbose": False}
    if language:
        options["language"] = language

    result = whisper_model.transcribe(audio_path, **options)
    segments = []
    for seg in result.get("segments", []):
        segments.append({
            "start": round(seg["start"], 2),
            "end": round(seg["end"], 2),
            "text": seg["text"].strip(),
        })
    return segments


def detect_audio_events(
    audio_path: str,
    start_sec: float,
    end_sec: float,
    preferences: Dict,
) -> Dict:
    """
    Detect non-speech audio events in a time range.
    Uses librosa feature extraction + rule-based detection.

    Returns:
        {"tags": [...], "confidence": float, "rms": float, "zcr": float}
    """
    try:
        y, sr = librosa.load(audio_path, sr=16000, offset=start_sec, duration=(end_sec - start_sec))
    except Exception as e:
        return {"tags": [], "confidence": 0.0}

    if len(y) == 0:
        return {"tags": [], "confidence": 0.0}

    tags = []
    confidence = 0.0

    # ── Features ──────────────────────────────────────────────────────────────
    rms = float(np.sqrt(np.mean(y ** 2)))
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))

    # Mel spectrogram for spectral analysis
    mel_spec = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=64)
    mel_db = librosa.power_to_db(mel_spec, ref=np.max)
    spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
    spectral_bandwidth = float(np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr)))

    # ── Rule-based detection ──────────────────────────────────────────────────

    # Scream: high RMS + high ZCR + high spectral centroid
    if preferences.get("detectScreaming", True):
        if rms > 0.15 and zcr > 0.20 and spectral_centroid > 3000:
            tags.append("scream")
            confidence = max(confidence, 0.75)

    # Explosion/loud noise: very high RMS + low ZCR (low-freq burst)
    if preferences.get("detectLoudNoises", True):
        if rms > 0.25 and zcr < 0.10:
            tags.append("explosion")
            confidence = max(confidence, 0.80)
        elif rms > 0.18:
            tags.append("loud_noise")
            confidence = max(confidence, 0.65)

    # Gunshot: sharp transient (high RMS peak, short duration)
    peaks = librosa.effects.split(y, top_db=20)
    short_loud_peaks = [p for p in peaks if (p[1] - p[0]) < sr * 0.3 and np.max(np.abs(y[p[0]:p[1]])) > 0.3]
    if len(short_loud_peaks) >= 2:
        tags.append("gunshot")
        confidence = max(confidence, 0.70)

    # Laughter: rhythmic, mid-frequency, medium amplitude
    if rms > 0.03 and rms < 0.15 and 1000 < spectral_centroid < 3000 and zcr > 0.12:
        tags.append("laughter")
        confidence = max(confidence, 0.55)

    # Silence / near-silence
    if rms < 0.005:
        tags.append("silence")

    return {
        "tags": list(set(tags)),
        "confidence": round(confidence, 3),
        "rms": round(rms, 4),
        "zcr": round(zcr, 4),
        "spectral_centroid": round(spectral_centroid, 1),
    }


def get_audio_for_scene(audio_path: str, start_sec: float, end_sec: float) -> Optional[np.ndarray]:
    """Load audio slice for a specific time range."""
    try:
        y, sr = librosa.load(audio_path, sr=16000, offset=start_sec, duration=(end_sec - start_sec))
        return y
    except Exception:
        return None
