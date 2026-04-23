"""
Parse natural language user input into structured content tags.
Uses zero-shot classification if available, otherwise keyword rules.
"""
from typing import List
from models.loader import ModelLoader


# Intent → tag mappings
INTENT_MAP = {
    "fight scenes": ["fight", "violence", "action"],
    "action sequences": ["action", "fight"],
    "funny moments": ["funny", "laughter"],
    "emotional scenes": ["emotional"],
    "important dialogues": ["emotional", "action"],
    "boring parts": ["boring"],
    "romantic scenes": ["romance", "emotional"],
    "horror scenes": ["horror", "scream"],
    "violent content": ["violence", "blood"],
    "nudity": ["nudity"],
    "abusive language": ["profanity", "abuse"],
    "explosions": ["explosion", "violence", "action"],
    "car chase": ["action"],
    "sad moments": ["emotional"],
    "climax": ["action", "emotional", "fight"],
}

ZERO_SHOT_LABELS = list(INTENT_MAP.keys())


async def parse_intent(text: str) -> List[str]:
    """
    Convert free-form user text to content tags.
    e.g. "Skip boring parts and show only fights" → ["fight", "action"]
    """
    if not text or not text.strip():
        return []

    # Try zero-shot classification first
    if ModelLoader.zero_shot_pipeline is not None:
        try:
            result = ModelLoader.zero_shot_pipeline(
                text,
                candidate_labels=ZERO_SHOT_LABELS,
                multi_label=True,
            )
            tags = []
            for label, score in zip(result["labels"], result["scores"]):
                if score > 0.4:
                    tags.extend(INTENT_MAP.get(label, []))
            if tags:
                return list(set(tags))
        except Exception as e:
            print(f"⚠️  Zero-shot intent parsing failed: {e}")

    # Fallback: keyword matching
    return _keyword_intent(text)


def _keyword_intent(text: str) -> List[str]:
    """Rule-based keyword extraction for intent parsing."""
    lower = text.lower()
    tags = set()

    keyword_rules = {
        "fight": ["fight", "brawl", "combat", "punch", "kick"],
        "action": ["action", "chase", "escape", "run", "explode", "explosion"],
        "funny": ["funny", "humor", "laugh", "comedy", "joke", "hilarious"],
        "emotional": ["emotional", "sad", "cry", "touching", "heartfelt", "romance", "love"],
        "horror": ["horror", "scary", "scare", "ghost", "demon", "monster"],
        "violence": ["violence", "violent", "brutal", "blood", "gore"],
        "nudity": ["nudity", "explicit", "sexual", "adult"],
        "profanity": ["abuse", "abusive", "swear", "curse", "profanity", "language"],
        "boring": ["boring", "slow", "dull", "skip", "uninteresting"],
    }

    for tag, keywords in keyword_rules.items():
        if any(kw in lower for kw in keywords):
            tags.add(tag)

    return list(tags)
