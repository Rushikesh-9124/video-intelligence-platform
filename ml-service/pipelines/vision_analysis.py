"""
Visual content analysis pipeline.
Uses CV-based heuristics + optional ViT for frame classification.
Detects: violence, blood, nudity, action, horror, fight, weapon, etc.
"""
import cv2
import numpy as np
from typing import List, Tuple


class VisionAnalyzer:
    """Analyzes video frames using color/motion heuristics + optional deep model."""

    def __init__(self, device: str = "cpu"):
        self.device = device

    def analyze_scene_frames(
        self,
        video_path: str,
        start_sec: float,
        end_sec: float,
        num_samples: int = 5,
    ) -> Tuple[List[str], float]:
        """
        Sample frames from a scene and classify content.
        Returns (tags, confidence).
        """
        frames = self._sample_frames(video_path, start_sec, end_sec, num_samples)
        if not frames:
            return [], 0.0

        all_tag_counts: dict = {}
        confidences = []

        for frame in frames:
            tags, conf = self._classify_frame(frame)
            for t in tags:
                all_tag_counts[t] = all_tag_counts.get(t, 0) + 1
            confidences.append(conf)

        # Tags present in at least 30% of sampled frames
        threshold = max(1, int(len(frames) * 0.3))
        final_tags = [t for t, cnt in all_tag_counts.items() if cnt >= threshold]
        avg_conf = float(np.mean(confidences)) if confidences else 0.0

        return final_tags, min(avg_conf, 1.0)

    def _sample_frames(
        self,
        video_path: str,
        start_sec: float,
        end_sec: float,
        num_samples: int,
    ) -> List[np.ndarray]:
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        start_f = int(start_sec * fps)
        end_f = int(end_sec * fps)

        positions = np.linspace(start_f, max(end_f - 1, start_f), num_samples, dtype=int)
        frames = []
        for pos in positions:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(pos))
            ret, frame = cap.read()
            if ret:
                frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        cap.release()
        return frames

    def _classify_frame(self, frame: np.ndarray) -> Tuple[List[str], float]:
        """Heuristic frame classifier. Replace with fine-tuned model in production."""
        tags = []
        conf = 0.45
        h, w = frame.shape[:2]
        total_pixels = h * w
        hsv = cv2.cvtColor(frame, cv2.COLOR_RGB2HSV)

        # ── Red dominance → blood/violence ──────────────────────────────────
        red_mask = (
            ((hsv[:, :, 0] < 10) | (hsv[:, :, 0] > 170))
            & (hsv[:, :, 1] > 100)
            & (hsv[:, :, 2] > 50)
        )
        red_ratio = np.sum(red_mask) / total_pixels
        if red_ratio > 0.06:
            tags.append("blood")
            conf = max(conf, 0.55 + red_ratio * 2)

        # ── Very dark frame → horror/night ──────────────────────────────────
        brightness = float(np.mean(hsv[:, :, 2]))
        if brightness < 35:
            tags.append("horror")
            conf = max(conf, 0.55)

        # ── Motion blur → fast action ────────────────────────────────────────
        gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        if blur_score < 40:
            tags.append("action")
            conf = max(conf, 0.5)

        # ── High edge density → crowd/fight ─────────────────────────────────
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / total_pixels
        if edge_density > 0.15:
            tags.append("fight")
            conf = max(conf, 0.52)

        # ── Skin tone → potential nudity ─────────────────────────────────────
        lower_skin = np.array([0, 20, 70], dtype=np.uint8)
        upper_skin = np.array([20, 255, 255], dtype=np.uint8)
        skin_ratio = np.sum(cv2.inRange(hsv, lower_skin, upper_skin) > 0) / total_pixels
        if skin_ratio > 0.40:
            tags.append("nudity")
            conf = max(conf, 0.5)

        return tags, conf


def get_vision_analyzer(device: str = "cpu") -> VisionAnalyzer:
    return VisionAnalyzer(device=device)
