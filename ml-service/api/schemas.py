from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from enum import Enum


class Mode(str, Enum):
    avoid = "avoid"
    find = "find"


class Sensitivity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Filters(BaseModel):
    violence: int = Field(3, ge=0, le=5)
    blood: int = Field(3, ge=0, le=5)
    nudity: int = Field(3, ge=0, le=5)
    abuse: int = Field(3, ge=0, le=5)
    horror: int = Field(3, ge=0, le=5)


class AudioPreferences(BaseModel):
    detectAbusiveLanguage: bool = True
    detectScreaming: bool = True
    detectLoudNoises: bool = True
    detectEmotionalTone: bool = True


class AnalyzeRequest(BaseModel):
    video_url: str
    mode: Mode = Mode.avoid
    sensitivity: Sensitivity = Sensitivity.medium
    filters: Filters = Filters()
    audio_preferences: AudioPreferences = AudioPreferences()
    parsed_tags: List[str] = []


class SceneResult(BaseModel):
    start: float          # seconds
    end: float            # seconds
    tags: List[str]
    source: List[str]     # ["video", "audio", "text"]
    confidence: float
    thumbnail: Optional[str] = None   # base64 jpeg
    transcript: Optional[str] = ""
    sentiment: Optional[str] = ""


class AnalyzeResponse(BaseModel):
    scenes: List[SceneResult]
    total_scenes: int
    processing_time: float
    model_versions: Dict[str, str]


class IntentRequest(BaseModel):
    text: str


class IntentResponse(BaseModel):
    tags: List[str]
    original: str
