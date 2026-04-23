"""
Scene segmentation using PySceneDetect.
Splits video into scenes with start/end timestamps.
"""
import cv2
from scenedetect import VideoManager, SceneManager
from scenedetect.detectors import ContentDetector, ThresholdDetector
from typing import List, Tuple


def segment_scenes(video_path: str, threshold: float = 27.0) -> List[Tuple[float, float]]:
    """
    Detect scene boundaries using content-aware detection.

    Args:
        video_path: Path to local video file
        threshold: Scene change sensitivity (lower = more scenes)

    Returns:
        List of (start_sec, end_sec) tuples
    """
    video_manager = VideoManager([video_path])
    scene_manager = SceneManager()
    scene_manager.add_detector(ContentDetector(threshold=threshold))

    try:
        video_manager.set_downscale_factor()
        video_manager.start()
        scene_manager.detect_scenes(frame_source=video_manager)
        scene_list = scene_manager.get_scene_list()
    finally:
        video_manager.release()

    if not scene_list:
        # Fallback: split into fixed-length chunks (10s)
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        cap.release()
        duration = total_frames / fps
        return _fixed_chunks(duration, chunk_size=10.0)

    scenes = []
    for start_time, end_time in scene_list:
        start_sec = start_time.get_seconds()
        end_sec = end_time.get_seconds()
        # Skip very short scenes (<1s) — likely artifacts
        if (end_sec - start_sec) >= 1.0:
            scenes.append((start_sec, end_sec))

    return scenes


def _fixed_chunks(duration: float, chunk_size: float = 10.0) -> List[Tuple[float, float]]:
    """Fallback: split video into fixed-duration chunks."""
    chunks = []
    start = 0.0
    while start < duration:
        end = min(start + chunk_size, duration)
        chunks.append((start, end))
        start = end
    return chunks


def extract_keyframe(video_path: str, timestamp_sec: float) -> bytes:
    """
    Extract a single frame from a video at a given timestamp.

    Args:
        video_path: Path to video
        timestamp_sec: Time position in seconds

    Returns:
        JPEG bytes of the frame
    """
    import numpy as np
    import base64

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    frame_num = int(timestamp_sec * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
    ret, frame = cap.read()
    cap.release()

    if not ret:
        return None

    # Resize for thumbnail
    h, w = frame.shape[:2]
    scale = 200 / w
    frame_resized = cv2.resize(frame, (200, int(h * scale)))

    _, buffer = cv2.imencode('.jpg', frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return base64.b64encode(buffer).decode('utf-8')
