import time
from fastapi import APIRouter, HTTPException, BackgroundTasks
from api.schemas import AnalyzeRequest, AnalyzeResponse, IntentRequest, IntentResponse
from pipelines.video_pipeline import run_full_pipeline
from pipelines.intent_parser import parse_intent

router = APIRouter()


@router.post("/analyze-video", response_model=AnalyzeResponse)
async def analyze_video(request: AnalyzeRequest):
    """
    Main endpoint: accepts video URL + preferences,
    runs full multimodal analysis pipeline, returns tagged scenes.
    """
    start = time.time()
    try:
        scenes, model_versions = await run_full_pipeline(request)
        return AnalyzeResponse(
            scenes=scenes,
            total_scenes=len(scenes),
            processing_time=round(time.time() - start, 2),
            model_versions=model_versions,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse-intent", response_model=IntentResponse)
async def parse_intent_endpoint(request: IntentRequest):
    """
    Convert natural language input into structured content tags.
    e.g. "Show me only fight scenes" -> ["fight", "action"]
    """
    try:
        tags = await parse_intent(request.text)
        return IntentResponse(tags=tags, original=request.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
