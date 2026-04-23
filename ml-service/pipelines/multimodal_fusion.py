"""
Multimodal fusion engine.

Combines signals from:
  - Visual analysis (CNN/ViT)
  - Audio event detection (librosa)
  - Speech-to-text NLP (Whisper + Transformers)

Applies weighted fusion with source-specific boosts.
"""
from typing import List, Dict, Set


# Cross-modal amplification: if tag appears in N sources, boost confidence
MULTI_SOURCE_BOOST = {1: 1.0, 2: 1.25, 3: 1.50}

# Some tags have inter-modal correlations — if both are present, strengthen both
CORRELATED_PAIRS = [
    ("violence", "scream"),
    ("violence", "gunshot"),
    ("violence", "explosion"),
    ("fight", "violence"),
    ("horror", "scream"),
    ("funny", "laughter"),
    ("emotional", "negative_emotion"),
]

# Tags that should always come from specific sources
SOURCE_TRUST = {
    "profanity": ["text"],       # Only trust NLP for profanity
    "laughter": ["audio"],       # Audio is best for laughter
    "scream": ["audio"],         # Audio is best for screams
    "explosion": ["audio", "video"],
    "blood": ["video"],          # Visual only
    "nudity": ["video"],
}


def fuse_signals(
    video_result: Dict,
    audio_events: Dict,
    nlp_result: Dict,
) -> Dict:
    """
    Fuse multimodal signals into a unified scene classification.

    Args:
        video_result: {"tags": [...], "confidence": float}
        audio_events: {"tags": [...], "confidence": float}
        nlp_result: {"tags": [...], "confidence": float, "sentiment": str, "abusive": bool}

    Returns:
        {
            "tags": [...],
            "source": [...],
            "confidence": float,
            "sentiment": str,
            "fusion_details": {...}
        }
    """
    # ── Collect all tags per source ───────────────────────────────────────────
    source_map: Dict[str, List[str]] = {
        "video": video_result.get("tags", []),
        "audio": audio_events.get("tags", []),
        "text": nlp_result.get("tags", []),
    }

    confidences = {
        "video": video_result.get("confidence", 0.0),
        "audio": audio_events.get("confidence", 0.0),
        "text": nlp_result.get("confidence", 0.0),
    }

    # ── Build tag → sources mapping ───────────────────────────────────────────
    tag_sources: Dict[str, Set[str]] = {}
    for source, tags in source_map.items():
        for tag in tags:
            # Apply source trust filter
            if tag in SOURCE_TRUST and source not in SOURCE_TRUST[tag]:
                continue
            tag_sources.setdefault(tag, set()).add(source)

    # ── Apply correlated pairs ────────────────────────────────────────────────
    all_current_tags = set(tag_sources.keys())
    for t1, t2 in CORRELATED_PAIRS:
        if t1 in all_current_tags and t2 in all_current_tags:
            # Both present — treat them as mutually reinforcing
            tag_sources[t1].update(tag_sources.get(t2, set()))
            tag_sources[t2].update(tag_sources.get(t1, set()))

    if not tag_sources:
        return {
            "tags": [],
            "source": [],
            "confidence": 0.0,
            "sentiment": nlp_result.get("sentiment", "neutral"),
            "fusion_details": {},
        }

    # ── Compute fused confidence per tag ─────────────────────────────────────
    tag_confidences: Dict[str, float] = {}
    for tag, sources in tag_sources.items():
        # Average confidence from contributing sources
        base_conf = np.mean([confidences[s] for s in sources if confidences[s] > 0]) if sources else 0.3
        boost = MULTI_SOURCE_BOOST.get(len(sources), 1.5)
        tag_confidences[tag] = min(0.99, base_conf * boost)

    # ── Final output ──────────────────────────────────────────────────────────
    final_tags = list(tag_sources.keys())
    # Remove noise tags like "silence" if other real tags exist
    if len(final_tags) > 1 and "silence" in final_tags:
        final_tags.remove("silence")

    active_sources = list(set(s for sources in tag_sources.values() for s in sources))
    overall_confidence = max(tag_confidences.values()) if tag_confidences else 0.0

    return {
        "tags": final_tags,
        "source": active_sources,
        "confidence": round(overall_confidence, 3),
        "sentiment": nlp_result.get("sentiment", "neutral"),
        "fusion_details": {
            "tag_confidences": {k: round(v, 3) for k, v in tag_confidences.items()},
            "contributing_sources": {k: list(v) for k, v in tag_sources.items()},
        },
    }


# Import numpy here to avoid circular issues
import numpy as np
