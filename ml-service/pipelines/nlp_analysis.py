"""
NLP analysis pipeline.
- Abusive language detection
- Sentiment analysis
- Emotion classification
- Topic/content tagging via zero-shot classification
"""
import re
from typing import List, Dict, Optional


# Curated abusive word list (expandable)
ABUSIVE_PATTERNS = [
    r'\b(fuck|shit|bitch|asshole|bastard|damn|cunt|piss)\b',
    r'\b(kill|murder|die|death|rape|abuse|beat up)\b',
]

COMPILED_ABUSIVE = [re.compile(p, re.IGNORECASE) for p in ABUSIVE_PATTERNS]

# Zero-shot candidate labels for scene tagging
CONTENT_LABELS = [
    "violence", "fight", "action", "romance", "comedy",
    "horror", "sadness", "anger", "fear", "suspense",
    "emotional dialogue", "profanity", "neutral conversation",
]

# Emotion → tag mapping
SENTIMENT_TAG_MAP = {
    "LABEL_0": "negative",  # cardiffnlp model labels
    "LABEL_1": "neutral",
    "LABEL_2": "positive",
    "negative": "negative",
    "neutral": "neutral",
    "positive": "positive",
}


def analyze_transcript(
    text: str,
    sentiment_pipeline=None,
    zero_shot_pipeline=None,
    audio_prefs: Dict = None,
) -> Dict:
    """
    Analyze a transcript segment for:
    - Abusive language
    - Sentiment
    - Content classification

    Returns:
        {
            "tags": [...],
            "confidence": float,
            "sentiment": str,
            "abusive": bool
        }
    """
    if not text or not text.strip():
        return {"tags": [], "confidence": 0.0, "sentiment": "neutral", "abusive": False}

    if audio_prefs is None:
        audio_prefs = {}

    tags = []
    confidence = 0.0
    abusive = False
    sentiment = "neutral"

    # ── Abusive language detection ────────────────────────────────────────────
    if audio_prefs.get("detectAbusiveLanguage", True):
        for pattern in COMPILED_ABUSIVE:
            if pattern.search(text):
                abusive = True
                tags.append("profanity")
                confidence = max(confidence, 0.90)
                break

    # ── Sentiment analysis ────────────────────────────────────────────────────
    if sentiment_pipeline is not None:
        try:
            # Truncate to model max length
            truncated = text[:512]
            result = sentiment_pipeline(truncated)[0]
            raw_label = result["label"]
            sentiment = SENTIMENT_TAG_MAP.get(raw_label, "neutral")
            sent_score = float(result["score"])

            if sentiment == "negative" and sent_score > 0.75:
                tags.append("negative_emotion")
                confidence = max(confidence, sent_score * 0.8)
            elif sentiment == "positive" and sent_score > 0.70:
                tags.append("positive_emotion")
        except Exception as e:
            print(f"  ⚠️  Sentiment analysis error: {e}")

    # ── Zero-shot content classification ─────────────────────────────────────
    if zero_shot_pipeline is not None:
        try:
            truncated = text[:512]
            result = zero_shot_pipeline(
                truncated,
                candidate_labels=CONTENT_LABELS,
                multi_label=True,
            )
            for label, score in zip(result["labels"], result["scores"]):
                if score > 0.50:  # threshold
                    mapped = _map_label_to_tag(label)
                    if mapped and mapped not in tags:
                        tags.append(mapped)
                    confidence = max(confidence, score)
        except Exception as e:
            print(f"  ⚠️  Zero-shot classification error: {e}")
    else:
        # Fallback: keyword-based classification
        tags.extend(_keyword_classify(text))
        if not tags:
            confidence = 0.0
        else:
            confidence = max(confidence, 0.60)

    return {
        "tags": list(set(tags)),
        "confidence": round(confidence, 3),
        "sentiment": sentiment,
        "abusive": abusive,
    }


def _map_label_to_tag(label: str) -> Optional[str]:
    """Map zero-shot classification labels to our tag taxonomy."""
    mapping = {
        "violence": "violence",
        "fight": "fight",
        "action": "action",
        "romance": "emotional",
        "comedy": "funny",
        "horror": "horror",
        "sadness": "emotional",
        "anger": "violence",
        "fear": "horror",
        "suspense": "horror",
        "emotional dialogue": "emotional",
        "profanity": "profanity",
        "neutral conversation": None,
    }
    return mapping.get(label.lower())


def _keyword_classify(text: str) -> List[str]:
    """Keyword fallback classification."""
    lower = text.lower()
    tags = []
    if any(w in lower for w in ["laugh", "funny", "hilarious", "haha", "joke", "humor"]):
        tags.append("funny")
    if any(w in lower for w in ["love", "miss you", "heart", "feel", "cry", "sad", "tears"]):
        tags.append("emotional")
    if any(w in lower for w in ["fight", "kill", "attack", "shoot", "war", "battle"]):
        tags.append("violence")
    if any(w in lower for w in ["run", "chase", "explode", "danger", "escape", "action"]):
        tags.append("action")
    if any(w in lower for w in ["scared", "horror", "ghost", "demon", "dark"]):
        tags.append("horror")
    return tags
